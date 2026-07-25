// 写真アップロード（F11・B-16）で受け付ける形式の判定と、Content-Type の補完。
//
// サーバ側の許可条件（hakken-api の app/imaging/validate.py）と1対1で対応させること:
//   JPEG : 拡張子 .jpg / .jpeg    Content-Type image/jpeg・image/jpg
//   PNG  : 拡張子 .png            Content-Type image/png
//   HEIC : 拡張子 .heic           Content-Type image/heic・image/heic-sequence
// サーバは拡張子・Content-Type・マジックナンバー・実デコード結果をクロスチェックし、
// どれかが食い違うと 400 を返す。ここでの判定はその手前でユーザーに理由を伝えるためのもの。
//
// ※汎用HEIF（.heif／mif1・msf1ブランド）はサーバが明示的に拒否する仕様のため、
//   ここでも受け付けず、専用のメッセージを出す。

/** <input type="file"> の accept。MIME と拡張子の両方を書く
 *  （HEIC の MIME が OS に登録されていない環境では、MIME 指定だけだと選択肢に出ないため）。 */
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,.jpg,.jpeg,.png,.heic";

/** 拡張子 → サーバが期待する Content-Type */
const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
};

/** サーバが受け付ける Content-Type */
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heic-sequence",
]);

/** 表記ゆれを代表値に寄せる（image/jpg→image/jpeg 等）。拡張子との整合判定に使う。 */
const canonical = (mime: string): string =>
  mime === "image/jpg" ? "image/jpeg" : mime === "image/heic-sequence" ? "image/heic" : mime;

const UNSUPPORTED = "JPEG／PNG／HEICのみ投稿できます";

/** ファイル名から小文字の拡張子（先頭ドット付き）を取り出す。無ければ空文字。 */
export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i < 0 ? "" : filename.slice(i).toLowerCase();
}

export type PhotoCheck = { ok: true } | { ok: false; reason: string };

/**
 * 選択されたファイルが投稿可能かを判定する。
 * File.type が空（ブラウザが MIME を判別できない。HEIC で起こりうる）の場合は拡張子で判定する。
 */
export function checkPhotoFile(file: File): PhotoCheck {
  const ext = extensionOf(file.name);
  const mime = (file.type || "").split(";")[0].trim().toLowerCase();

  if (ext === ".heif") {
    return { ok: false, reason: "HEIF形式は投稿できません（HEICのみ対応）" };
  }
  const expected = MIME_BY_EXT[ext];
  if (!expected) {
    return { ok: false, reason: UNSUPPORTED };
  }
  if (!mime) {
    // ブラウザが判別できなかった場合は拡張子を信じる（送信時に Content-Type を補う）
    return { ok: true };
  }
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, reason: UNSUPPORTED };
  }
  if (canonical(mime) !== expected) {
    // 拡張子と中身の申告が食い違う。送ってもサーバが 400 にするため手前で止める。
    return { ok: false, reason: "拡張子とファイル形式が一致していません" };
  }
  return { ok: true };
}

/**
 * 送信直前の正規化。**File.type が空のときだけ**拡張子から Content-Type を補う。
 * 値が入っている場合はブラウザの判定を尊重し、一切書き換えない。
 */
export function normalizePhotoFile(file: File): File {
  if (file.type) return file;
  const contentType = MIME_BY_EXT[extensionOf(file.name)];
  if (!contentType) return file; // 判断できないならそのまま送る（サーバ側で 400 になる）
  return new File([file], file.name, { type: contentType, lastModified: file.lastModified });
}
