const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Try to set ffmpeg path if available
try {
  const ffmpegPath = require('ffmpeg-static');
  const ffprobePath = require('ffprobe-static').path;
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
  if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath);
  console.log('✅ FFmpeg paths configured from npm packages');
} catch (err) {
  console.log('ℹ️ ffmpeg-static not configured, using system ffmpeg');
}

const generateThumbnail = async (videoPath, outputDir) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🎬 [THUMBNAIL] Starting generation...');
      console.log('  - Input:', videoPath);
      console.log('  - Output dir:', outputDir);
      
      // Validate input file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }
      
      const filename = path.parse(videoPath).name;
      const thumbnailPath = path.join(outputDir, `${filename}_thumb.jpg`);

      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        console.log('📁 Creating output directory:', outputDir);
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log('📸 Extracting screenshot...');
      
      // Set a timeout to catch hanging ffmpeg processes
      const timeoutId = setTimeout(() => {
        console.error('❌ FFmpeg timeout - no response after 30 seconds');
        reject(new Error('FFmpeg timeout'));
      }, 30000);

      const ffmpegCmd = ffmpeg(videoPath)
        .on('start', (cmd) => {
          console.log('🚀 FFmpeg started');
        })
        .on('end', () => {
          clearTimeout(timeoutId);
          
          // Verify thumbnail was actually created
          if (fs.existsSync(thumbnailPath)) {
            console.log('✅ Thumbnail generated:', thumbnailPath);
            resolve(thumbnailPath);
          } else {
            console.error('❌ Thumbnail file not created at:', thumbnailPath);
            reject(new Error('Thumbnail file was not created'));
          }
        })
        .on('error', (err) => {
          clearTimeout(timeoutId);
          console.error('❌ FFmpeg error:', err.message);
          reject(err);
        });
      
      // Explicitly trigger the screenshot
      ffmpegCmd.screenshots({
        count: 1,
        folder: outputDir,
        filename: `${filename}_thumb.jpg`,
        size: '320x240',
        timestamps: ['2']  // Extract at 2 seconds
      });
    } catch (err) {
      console.error('❌ [THUMBNAIL] Error:', err.message);
      reject(err);
    }
  });
};

module.exports = { generateThumbnail };