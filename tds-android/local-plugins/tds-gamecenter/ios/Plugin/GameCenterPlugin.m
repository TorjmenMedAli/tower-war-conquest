#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the plugin with Capacitor under the JS name "TDSGameCenter".
CAP_PLUGIN(GameCenterPlugin, "TDSGameCenter",
  CAP_PLUGIN_METHOD(signIn, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(submitScore, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(unlockAchievement, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(showLeaderboards, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(showAchievements, CAPPluginReturnPromise);
)
