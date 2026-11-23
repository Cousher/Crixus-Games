const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const Case = require("../models/Case");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const { isSafeImageUrl, isValidObjectId } = require("../middleware/security");
const ALLOWED_RARITIES = new Set(["1", "2", "3", "4", "5"]);

router.get("/", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", isAuthenticated, isAdmin, async (req, res) => {
  const { name, image, rarity, case: caseId } = req.body;
  if (typeof name !== "string" || !name.trim() || !ALLOWED_RARITIES.has(String(rarity))) {
    return res.status(400).json({ message: "Invalid item payload" });
  }
  if (!isSafeImageUrl(image)) {
    return res.status(400).json({ message: "Invalid image URL" });
  }
  if (!isValidObjectId(caseId)) {
    return res.status(400).json({ message: "Invalid case id" });
  }

  try {
    const caseToUpdate = await Case.findById(caseId);
    if (!caseToUpdate) {
      return res.status(404).json({ message: "Case not found" });
    }

    const newItem = new Item({
      name: name.trim().slice(0, 120),
      image: typeof image === "string" ? image.trim() : "",
      rarity: String(rarity),
      case: caseId,
    });
    const savedItem = await newItem.save();

    caseToUpdate.items.push(savedItem._id);
    await caseToUpdate.save();

    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const { name, image, rarity, case: caseId } = req.body;
    const updateFields = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Invalid name" });
      }
      updateFields.name = name.trim().slice(0, 120);
    }
    if (image !== undefined) {
      if (!isSafeImageUrl(image)) {
        return res.status(400).json({ message: "Invalid image URL" });
      }
      updateFields.image = typeof image === "string" ? image.trim() : "";
    }
    if (rarity !== undefined) {
      if (!ALLOWED_RARITIES.has(String(rarity))) {
        return res.status(400).json({ message: "Invalid rarity" });
      }
      updateFields.rarity = String(rarity);
    }
    if (caseId !== undefined) {
      if (!isValidObjectId(caseId)) {
        return res.status(400).json({ message: "Invalid case id" });
      }
      updateFields.case = caseId;
    }

    const updateItem = await Item.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });
    if (!updateItem) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(updateItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
