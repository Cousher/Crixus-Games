const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const { isSafeImageUrl, isValidObjectId } = require("../middleware/security");
const User = require("../models/User");
const Case = require("../models/Case");
const Item = require("../models/Item");
const ALLOWED_RARITIES = new Set(["1", "2", "3", "4", "5"]);

router.get("/users", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//create case
router.post("/cases", isAuthenticated, isAdmin, async (req, res) => {
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
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//update case
router.put("/cases/:id", isAuthenticated, isAdmin, async (req, res) => {
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
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//delete case
router.delete("/cases/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid case id" });
    }
    const deletedCase = await Case.findByIdAndDelete(req.params.id);

    if (!deletedCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.json({ message: "Case deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//new item
router.post("/items", isAuthenticated, isAdmin, async (req, res) => {
  const { name, rarity, image } = req.body;
  if (typeof name !== "string" || !name.trim() || !ALLOWED_RARITIES.has(String(rarity))) {
    return res.status(400).json({ message: "Invalid item payload" });
  }
  if (!isSafeImageUrl(image)) {
    return res.status(400).json({ message: "Invalid image URL" });
  }
  const newItem = new Item({
    name: name.trim().slice(0, 120),
    rarity: String(rarity),
    image: typeof image === "string" ? image.trim() : "",
  });

  try {
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//update item
router.put("/items/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const { name, rarity, image, case: itemCase } = req.body;
    const updateFields = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Invalid name" });
      }
      updateFields.name = name.trim().slice(0, 120);
    }
    if (rarity !== undefined) {
      if (!ALLOWED_RARITIES.has(String(rarity))) {
        return res.status(400).json({ message: "Invalid rarity" });
      }
      updateFields.rarity = String(rarity);
    }
    if (image !== undefined) {
      if (!isSafeImageUrl(image)) {
        return res.status(400).json({ message: "Invalid image URL" });
      }
      updateFields.image = typeof image === "string" ? image.trim() : "";
    }
    if (itemCase !== undefined) {
      if (!isValidObjectId(itemCase)) {
        return res.status(400).json({ message: "Invalid case id" });
      }
      updateFields.case = itemCase;
    }

    const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(updatedItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});


//delete item
router.delete("/items/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const deletedItem = await Item.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//update wallet balance
router.put("/users/:id/wallet", isAuthenticated, isAdmin, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  const balance = Number(req.body.walletBalance);
  if (!Number.isFinite(balance) || balance < 0 || balance > 100000000) {
    return res.status(400).json({ message: "Invalid wallet balance" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { walletBalance: Math.floor(balance * 100) / 100 } },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.walletBalance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//update inventory
router.put(
  "/users/:id/inventory",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const { inventory } = req.body;
    if (!Array.isArray(inventory) || inventory.length > 500) {
      return res.status(400).json({ message: "Invalid inventory payload" });
    }

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.inventory = inventory;
      await user.save();

      res.json(user.inventory);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
