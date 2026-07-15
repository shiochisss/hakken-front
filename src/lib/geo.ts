const IS_MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

/** モック時のフォールバック現在地（練馬駅付近） */
const MOCK_POS = { lat: 35.7357, lng: 139.6518 };

/** 前面GPSを1回だけ取得（F2）。常時追跡はしない・できない。
 *  モックモードでは、位置情報が取れない/拒否された場合も練馬駅にフォールバックする。 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      IS_MOCK ? resolve(MOCK_POS) : reject(new Error("geolocation_unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => (IS_MOCK ? resolve(MOCK_POS) : reject(err)),
      { enableHighAccuracy: false, timeout: IS_MOCK ? 3000 : 10000, maximumAge: 60000 }
    );
  });
}
