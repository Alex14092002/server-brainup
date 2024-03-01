// router file
import express from "express";
import { addInfo , confirmPayment , getAllInfo } from "../controllers/infoController.mjs";

const router = express.Router();

router.post("/add" , addInfo);
router.patch('/update/:infoId' ,confirmPayment)
router.get('/' , getAllInfo)

export default router;
