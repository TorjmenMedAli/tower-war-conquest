import Foundation
import Capacitor
import GameKit

/// Game Center bridge for TDS. JS name: `TDSGameCenter` (window.Capacitor.Plugins.TDSGameCenter).
/// Mirrors the subset of Play Games Services the game uses on Android:
/// signIn / submitScore / unlockAchievement / showLeaderboards / showAchievements.
/// Fully defensive: every call rejects cleanly when Game Center is unavailable, and
/// native.js swallows rejections, so a missing GC login can never break the game.
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, GKGameCenterControllerDelegate {

    private var authenticated = false

    @objc func signIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var settled = false // authenticateHandler can fire more than once (login sheet flow)
            GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
                guard let self = self else { return }
                if let viewController = viewController {
                    // Game Center wants to show its login sheet; the handler fires again afterwards.
                    self.bridge?.viewController?.present(viewController, animated: true)
                    return
                }
                self.authenticated = GKLocalPlayer.local.isAuthenticated
                if settled { return }
                settled = true
                if self.authenticated {
                    call.resolve(["player": GKLocalPlayer.local.displayName])
                } else {
                    call.reject(error?.localizedDescription ?? "Game Center not authenticated")
                }
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""
        let score = call.getInt("score") ?? 0
        guard authenticated, !id.isEmpty else { return call.reject("Game Center unavailable") }
        if #available(iOS 14.0, *) {
            GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        } else {
            let reported = GKScore(leaderboardIdentifier: id)
            reported.value = Int64(score)
            GKScore.report([reported]) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        }
    }

    @objc func unlockAchievement(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""
        guard authenticated, !id.isEmpty else { return call.reject("Game Center unavailable") }
        let achievement = GKAchievement(identifier: id)
        achievement.percentComplete = 100
        achievement.showsCompletionBanner = true
        GKAchievement.report([achievement]) { error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
        }
    }

    @objc func showLeaderboards(_ call: CAPPluginCall) {
        presentGameCenter(state: .leaderboards, call: call)
    }

    @objc func showAchievements(_ call: CAPPluginCall) {
        presentGameCenter(state: .achievements, call: call)
    }

    private func presentGameCenter(state: GKGameCenterViewControllerState, call: CAPPluginCall) {
        guard authenticated else { return call.reject("Game Center unavailable") }
        DispatchQueue.main.async {
            let viewController: GKGameCenterViewController
            if #available(iOS 14.0, *) {
                viewController = GKGameCenterViewController(state: state)
            } else {
                viewController = GKGameCenterViewController()
                viewController.viewState = state
            }
            viewController.gameCenterDelegate = self
            self.bridge?.viewController?.present(viewController, animated: true)
            call.resolve()
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
