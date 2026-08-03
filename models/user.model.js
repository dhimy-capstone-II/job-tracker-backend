// models/user.model.js — the User table.
//
// A user can enter the app in two ways:
//
// 1. Local signup:
//    The user provides an email and password.
//    We store only the bcrypt password hash.
//
// 2. Auth0 login:
//    Auth0 manages the credential.
//    We store the permanent Auth0 user ID in auth0Id.
//
// passwordHash and auth0Id are both nullable because each user
// normally uses one authentication method or the other.

const { DataTypes } = require("sequelize");
const db = require("../db");

const User = db.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    // Optional full name.
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Display name used inside the application.
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 20],
      },
    },

    // Used for local login and may also come from Auth0.
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    // Stores only the bcrypt hash, never the original password.
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Permanent Auth0 user identifier.
    auth0Id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
  },
  {
    tableName: "users",
  },
);

// Prevent passwordHash from being included in JSON responses.
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.passwordHash;
  return values;
};

module.exports = User;