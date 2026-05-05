"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = void 0;
const db_1 = require("../db");
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const categories = yield db_1.prisma.category.findMany({
            where: { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error fetching categories' });
    }
});
exports.getCategories = getCategories;
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name, budget } = req.body;
    try {
        const category = yield db_1.prisma.category.create({
            data: {
                name,
                budget: budget ? parseFloat(budget) : 0,
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            },
        });
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error creating category' });
    }
});
exports.createCategory = createCategory;
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = req.params.id;
    const { name, budget } = req.body;
    try {
        const category = yield db_1.prisma.category.update({
            where: { id, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
            data: Object.assign({ name }, (budget !== undefined && { budget: parseFloat(budget) })),
        });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error updating category' });
    }
});
exports.updateCategory = updateCategory;
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = req.params.id;
    try {
        yield db_1.prisma.category.delete({
            where: { id, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
        });
        res.json({ message: 'Category removed' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error deleting category' });
    }
});
exports.deleteCategory = deleteCategory;
