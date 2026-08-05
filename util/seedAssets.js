const fs = require("fs");
const path = require("path");
const Frame = require("../server/frame/frame.model");
const Badge = require("../server/badge/badge.model");
const Tag = require("../server/tag/tag.model");

const seedAssets = async () => {
  try {
    const storagePath = path.join(__dirname, "../storage");

    // Seed Frames
    const frameDir = path.join(storagePath, "frames");
    if (fs.existsSync(frameDir)) {
      const files = fs.readdirSync(frameDir);
      for (const file of files) {
        const frameExist = await Frame.findOne({ image: "storage/frames/" + file });
        if (!frameExist) {
          const newFrame = new Frame({ image: "storage/frames/" + file, name: file.split(".")[0] });
          await newFrame.save();
        }
      }
      console.log("✓ SEED: Frames seeded successfully");
    }

    // Seed Badges
    const badgeDir = path.join(storagePath, "badges");
    if (fs.existsSync(badgeDir)) {
      const files = fs.readdirSync(badgeDir);
      for (const file of files) {
        const badgeExist = await Badge.findOne({ image: "storage/badges/" + file });
        if (!badgeExist) {
          const newBadge = new Badge({ image: "storage/badges/" + file, name: file.split(".")[0], type: 0 });
          await newBadge.save();
        }
      }
    }
    const vipBadgeDir = path.join(storagePath, "vip_badges");
    if (fs.existsSync(vipBadgeDir)) {
      const files = fs.readdirSync(vipBadgeDir);
      for (const file of files) {
        const badgeExist = await Badge.findOne({ image: "storage/vip_badges/" + file });
        if (!badgeExist) {
          const newBadge = new Badge({ image: "storage/vip_badges/" + file, name: file.split(".")[0], type: 1 });
          await newBadge.save();
        }
      }
      console.log("✓ SEED: Badges seeded successfully");
    }

    // Seed Tags
    const tagDir = path.join(storagePath, "tags");
    if (fs.existsSync(tagDir)) {
      const files = fs.readdirSync(tagDir);
      for (const file of files) {
        const tagExist = await Tag.findOne({ image: "storage/tags/" + file });
        if (!tagExist) {
          const newTag = new Tag({ image: "storage/tags/" + file, name: file.split(".")[0] });
          await newTag.save();
        }
      }
      console.log("✓ SEED: Tags seeded successfully");
    }

  } catch (err) {
    console.error("✖ SEED: Error seeding assets:", err.message);
  }
};

module.exports = seedAssets;
