import { Keyboard } from "grammy";

export const mainKeyboard = new Keyboard()
	.text("📥 Download")
	.text("💾 Check Storage")
	.row()
	.text("🔍 Check Jellyfin Status")
	.resized()
	.persistent();
