// BiteScan only schedules *local* notifications (calorie alerts, reminders); it never receives
// remote pushes. expo-notifications adds the `aps-environment` (Push Notifications) entitlement,
// which free Apple ID "Personal Team" signing can't provision, so the build would fail.
// Local notifications don't need it, so remove it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
