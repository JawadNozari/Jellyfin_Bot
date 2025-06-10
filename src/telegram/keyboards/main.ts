import { Keyboard } from 'grammy';

export const mainKeyboard = new Keyboard()
	.text('📥 Download')
	.row()
	.text('💾 Check Storage')
	.row()
	.text('🔍 Check Jellyfin Status')
	.row()
	.text('💽 Merge Subtitles to Video')
	.resized()
	.persistent();
