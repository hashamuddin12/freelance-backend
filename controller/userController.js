const { users } = require("../models/userModel");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { skilltests } = require("../models/skillTestModel");

const userSignUp = async (req, res) => {
  try {
    const checkEmail = await users
      .findOne({
        emailAddress: req.body.emailAddress,
      })
      .select({ _id: 1 });
    if (checkEmail) {
      return res.status(400).send({
        success: false,
        message: "This Email Address is already Exist",
      });
    }

    const user = new users({
      emailAddress: req.body.emailAddress,
      fullName: req.body.fullName,
      password: req.body.password,
      role: req.body.role,
    });
    let saltPassword = await bcrypt.genSalt(10);
    let encryptedPassword = await bcrypt.hash(user.password, saltPassword);
    user.password = encryptedPassword;

    await user.save();

    const token = jwt.sign(
      { _id: user._id, emailAddress: user.emailAddress },
      process.env.TOKEN_KEY,
      {
        expiresIn: "30d",
      }
    );

    return res.status(200).send({
      success: true,
      message: "User Registered Successfully",
      data: user,
      token,
    });
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      success: false,
      message: "Something went wrong",
    });
  }
};

const userSignIn = async (req, res) => {
  try {
    const checkUser = await users.findOne({
      emailAddress: req.body.emailAddress,
      role: req.body.role
    });

    if (!checkUser) {
      return res.status(400).send({
        success: false,
        message: "Invalid Email",
      });
    }

    const token = jwt.sign(
      { _id: checkUser._id, emailAddress: checkUser.emailAddress },
      process.env.TOKEN_KEY,
      {
        expiresIn: "30d",
      }
    );

    if (checkUser.isProfileCompleted === false) {
      return res.status(200).send({
        success: true,
        message: "First Complete Your Profile",
        token,
      });
    }

    if (checkUser.role === "agent" && checkUser.isProfileVerified === false) {
      return res.status(200).send({
        success: true,
        message: "First Verify Your Profile",
        token,
      });
    }

    if (
      checkUser &&
      (await bcrypt.compare(req.body.password, checkUser.password))
    ) {
      const token = jwt.sign(
        { _id: checkUser._id, emailAddress: checkUser.emailAddress },
        process.env.TOKEN_KEY,
        {
          expiresIn: "30d",
        }
      );

      return res.status(200).send({
        success: true,
        message: "User Login Successfully",
        data: checkUser,
        token,
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Invalid Credentials",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const fetchUser = await users.findOne({ _id: req.user._id }).select({
      password: 0,
    });

    if (!fetchUser) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "User Data has been Fetched Successfully",
      data: fetchUser,
    });
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      success: false,
      message: "Something went wrong",
    });
  }
};

const completeProfile = async (req, res) => {
  try {
    await users.updateOne(
      { _id: req.user._id },
      {
        phoneNumber: req.body.phoneNumber,
        description: req.body.description,
        experience: req.body.experience,
        isProfileCompleted: true,
        skills: req.body.skills,
        price: req.body.price,
      }
    );
    return res.status(200).send({
      success: true,
      message: "Profile Completed Successfully",
    });
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getQuizQuestion = async (req, res) => {
  try {
    const fetchQuestion = await skilltests.aggregate([{ $sample: { size: 2 } }]);
    return res.status(200).send({
      success: true,
      message: "Quiz Questions has been Fetched Successfully",
      data: fetchQuestion,
    });
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      success: false,
      message: "Something went wrong",
    });
  }
};

const submitQuiz = async (req, res) => {
  try { 
    let correctQuestions=0;

    for(let i=0;i<req.body.arr.length;i++){
      if(req.body.arr[i].selectValue===req.body.arr[i].rightAnswer){
        correctQuestions++
      }
    }

    const percentage = (correctQuestions / req.body.arr.length) * 100;

    if (percentage >= 50) {
      await users.updateOne(
        { _id: req.user._id },
        {
          isProfileVerified: true,
        }
      );
      return res.status(200).send({
        success: true,
        message: "You pass this exam",
      });
    } else {
      return res.status(200).send({
        success: true,
        message: "You failed this exam",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(400).send({
      success: false,
      message: "Something went wrong",
    });
  }
}

module.exports = {
  userSignUp,
  userSignIn,
  getUserProfile,
  completeProfile,
  getQuizQuestion,
  submitQuiz
};
