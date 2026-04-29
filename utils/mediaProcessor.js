const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");
const fs = require("fs");
const path = require("path");
const { channel } = require("process");
const { transcode } = require("buffer");

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

async function compressImage(inputPath, outputDir, quality = "medium") {
  try {
    const qualitySettings = {
      low: { quality: 40, width: 640 },
      medium: { quality: 60, width: 1280 },
      high: { quality: 80, width: 1920 },
    };

    const settings = qualitySettings[quality] || qualitySettings.medium;
    const inputSize = fs.statSync(inputPath).size;
    const basename = path.parse(inputPath).name;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const thumbnailPath = path.join(outputDir, `${basename}-thumb.webp`);
    await sharp(inputPath)
      .resize(200, 200, { fit: "cover" })
      .webp({ quality: 70 })
      .toFile(thumbnailPath);

    const mediumPath = path.join(outputDir, `${basename}-medium.webp`);
    await sharp(inputPath)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(mediumPath);

    const fullPath = path.join(outputDir, `${basename}-full.webp`);
    await sharp(inputPath)
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(fullPath);

    const outputSize = fs.statSync(fullPath).size;
    const compressionRatio = ((1 - outputSize / inputSize) * 100).toFixed(2);

    console.log(`Image Compressed : ${compressionRatio}% reduced this much`);

    return {
      thumbnail: thumbnailPath,
      medium: mediumPath,
      full: fullPath,
      originalSize: inputSize,
      compressedSize: outputSize,
      compressionRatio: parseFloat(compressionRatio),
      format: "webp",
    };
  } catch (err) {
    console.error("Image compression failed:", err.message);
  }
}

// async function transcodeVideo(inputPath, outputDir, quality = "medium") {
//   return new Promise((resolve, reject) => {
//     // Quality presets
//     const presets = {
//       low: [
//         { resolution: "360x360", bitrate: "500k", output: "video-360p.mp4" },
//       ],
//       medium: [
//         { resolution: "360x360", bitrate: "800k", output: "video-360p.mp4" },
//         { resolution: "720x720", bitrate: "2500k", output: "video-720p.mp4" },
//       ],
//       high: [
//         { resolution: "360x360", bitrate: "800k", output: "video-360p.mp4" },
//         { resolution: "720x720", bitrate: "2500k", output: "video-720p.mp4" },
//         { resolution: "1080x1080", bitrate: "5000k", output: "video-1080p.mp4" },
//       ],
//     };

//     const outputs = presets[quality] || presets.medium;
//     let completedCount = 0;
//     const results = {};

//     // Ensure output directory exists
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }

//     outputs.forEach((output) => {
//       const outputPath = path.join(outputDir, output.output);

//       ffmpeg(inputPath)
//         .outputOptions([
//           `-vf scale=${output.resolution}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
//           "-c:v libx264",
//           "-crf 23",
//           `-b:v ${output.bitrate}`,
//           "-c:a aac",
//           "-b:a 128k",
//         ])
//         .output(outputPath)
//         .on("end", () => {
//           const fileSize = fs.statSync(outputPath).size;
//           console.log(
//             `✅ Video transcoded: ${output.output} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`
//           );
//           results[output.resolution.split("x")[0] + "p"] = outputPath;
//           completedCount++;

//           if (completedCount === outputs.length) {
//             resolve(results);
//           }
//         })
//         .on("error", (err) => {
//           console.error(`❌ Transcoding failed:`, err.message);
//           reject(err);
//         })
//         .run();
//     });
//   });
// }

async function transcodeVideo(inputPath, outputDir, quality = "medium") {
  return new Promise((resolve, reject) => {
    const presets = {
      low: [
        { resolution: "360x360", bitrate: "500k", output: "video-360p.mp4" },
      ],
      medium: [
        { resolution: "360x360", bitrate: "800k", output: "video-360p.mp4" },
        { resolution: "720x720", bitrate: "2500k", output: "video-720p.mp4" },
      ],
      high: [
        { resolution: "360x360", bitrate: "800k", output: "video-360p.mp4" },
        { resolution: "720x720", bitrate: "2500k", output: "video-720p.mp4" },
        {
          resolution: "1080x1080",
          bitrate: "5000k",
          output: "video-1080p.mp4",
        },
      ],
    };

    const outputs = presets[quality] || presets.medium;
    let completedCount = 0;
    const results = {};

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    outputs.forEach((output) => {
      const outputPath = path.join(outputDir, output.output);

      ffmpeg(inputPath).outputOptions([
        `-vf scale=${output.resolution}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
        "-c:v libx264",
        "-crf 23",
        `-b:v ${output.bitrate}`,
        "-c:a aac",
        "-b:a 128k",
      ])
      .output(outputPath)
      .on("end" , () => {
        const fileSize = fs.statSync(outputPath).size;
        console.log(`Video transcoded: ${output.output} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
        results[output.resolution.split("x")[0] + "p"] = outputPath;
        completedCount++;

        if(completedCount === outputs.length) {
            resolve(results);
        }
      })
      .on("error", (err) => {
        console.error(`Transcoding failed`, err.message);
        reject(err);
      })
      .run()
    });
  });
}

async function generateVideoThumbnail(inputPath, outputPath) {
    return new Promise((resolve , reject) => {
        const dir = path.dirname(outputPath);
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }

        ffmpeg(inputPath)
          .on("end" , () => {
            console.log("Thumbnail Generated");
            resolve(outputPath);
          })  
          .on("error" , (err) => {
            console.log("Thumbnail Generation Fail:", err.message);
            reject(err);
          })
          .screenshots({
            timestamps:[1],
            filename: path.basename(outputPath),
            folder: dir,
            size:"640x640"
          })  
    })
}

async function getVideoInfo(inputPath) {
  return new Promise((resolve, reject) =>  {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if(err) {
        console.error(err.message)
        reject(err);
      }else {
        const videoStream = metadata.streams.find((s) => s.codec_type === "video");
        const audioStream = metadata.streams.find((s) => s.codec_type === "audio");

        resolve({
          duration : metadata.format.duration,
          size: metadata.format.size,
          video: {
            codec: videoStream?.codec_name,
            width: videoStream?.width,
            height: videoStream?.height,
            fps: eval(videoStream?.r_frame_rate),
          },
          audio: {
            codec : audioStream?.codec_name,
            channels: audioStream?.channels,
          },
        })
      }
    })
  })
}

module.exports = {
  compressImage,
  transcodeVideo,
  generateVideoThumbnail,
  getVideoInfo
};
