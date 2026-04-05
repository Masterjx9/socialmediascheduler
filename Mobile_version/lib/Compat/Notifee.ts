import { Platform } from "react-native";

let NativeNotifee: any = null;
let NativeNotifeeModule: any = null;
try {
  NativeNotifeeModule = require("@notifee/react-native");
  NativeNotifee = NativeNotifeeModule.default ?? NativeNotifeeModule;
} catch (_e) {
  NativeNotifee = null;
  NativeNotifeeModule = null;
}

const AndroidImportance = NativeNotifeeModule?.AndroidImportance ?? { HIGH: 4 };

const AndroidColor = NativeNotifeeModule?.AndroidColor ?? { RED: "#FF0000" };

const EventType = NativeNotifeeModule?.EventType ?? { ACTION_PRESS: 1 };

const noopAsync = async () => undefined;
const noopUnsub = () => () => undefined;

const fallbackNotifee = {
  requestPermission: noopAsync,
  createChannel: async () => "default",
  displayNotification: noopAsync,
  onForegroundEvent: noopUnsub,
  onBackgroundEvent: noopAsync,
};

const notifee =
  Platform.OS === "windows" ? fallbackNotifee : (NativeNotifee ?? fallbackNotifee);

export { AndroidImportance, AndroidColor, EventType };
export default notifee;
