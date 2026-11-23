const express = require("express");
const router = express.Router();
const Case = require("../models/Case");
const Item = require("../models/Item");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const { isSafeImageUrl, isValidObjectId } = require("../middleware/security");

router.get("/", async (req, res) => {
  try {
    const cases = await Case.find().select('-items');
    res.json(cases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", isAuthenticated, isAdmin, async (req, res) => {
  const { title, image, price, items } = req.body;
  const numPrice = Number(price);
  if (typeof title !== "string" || !title.trim() || !Number.isFinite(numPrice) || numPrice < 1) {
    return res.status(400).json({ message: "Invalid case payload" });
  }
  if (!isSafeImageUrl(image)) {
    return res.status(400).json({ message: "Invalid image URL" });
  }
  const newCase = new Case({
    title: title.trim().slice(0, 120),
    image: typeof image === "string" ? image.trim() : "",
    price: Math.floor(numPrice),
    items: Array.isArray(items) ? items.filter(isValidObjectId) : [],
  });

  try {
    const savedCase = await newCase.save();
    res.status(201).json(savedCase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Case not found" });
    }
    const caseData = await Case.findById(req.params.id).populate({
      path: "items",
      options: { sort: { rarity: -1 } },
    });
    if (!caseData) {
      return res.status(404).json({ message: "Case not found" });
    }
    res.json(caseData);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid case id" });
    }
    const { title, image, price, items } = req.body;
    const updateFields = {};
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Invalid title" });
      }
      updateFields.title = title.trim().slice(0, 120);
    }
    if (image !== undefined) {
      if (!isSafeImageUrl(image)) {
        return res.status(400).json({ message: "Invalid image URL" });
      }
      updateFields.image = typeof image === "string" ? image.trim() : "";
    }
    if (price !== undefined) {
      const numPrice = Number(price);
      if (!Number.isFinite(numPrice) || numPrice < 1) {
        return res.status(400).json({ message: "Invalid price" });
      }
      updateFields.price = Math.floor(numPrice);
    }
    if (items !== undefined) {
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid items" });
      }
      updateFields.items = items.filter(isValidObjectId);
    }

    const updatedCase = await Case.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });
    if (!updatedCase) {
      return res.status(404).json({ message: "Case not found" });
    }
    res.json(updatedCase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid case id" });
    }
    const deleted = await Case.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Case not found" });
    }
    res.json({ message: "Case deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
