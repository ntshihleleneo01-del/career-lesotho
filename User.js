const { db } = require('../firebase-admin');

class User {
  constructor(data) {
    this.id = data.id || null;
    this.email = data.email;
    this.role = data.role; // 'admin', 'institute', 'student', 'company'
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.isVerified = data.isVerified || false;
    this.profileComplete = data.profileComplete || false;

    // Role-specific fields
    if (this.role === 'student') {
      this.studentData = data.studentData || {};
    } else if (this.role === 'institute') {
      this.instituteData = data.instituteData || {};
    } else if (this.role === 'company') {
      this.companyData = data.companyData || {};
    }
  }

  static async create(userData) {
    try {
      const userRef = db.collection('users').doc();
      const user = new User({ ...userData, id: userRef.id });
      await userRef.set({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return user;
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const userDoc = await db.collection('users').doc(id).get();
      if (!userDoc.exists) {
        return null;
      }
      return new User({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      throw new Error(`Error finding user: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
      if (userQuery.empty) {
        return null;
      }
      const userDoc = userQuery.docs[0];
      return new User({ id: userDoc.id, ...userDoc.data() });
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  async update(updateData) {
    try {
      const userRef = db.collection('users').doc(this.id);
      await userRef.update({
        ...updateData,
        updatedAt: new Date()
      });
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  async delete() {
    try {
      await db.collection('users').doc(this.id).delete();
      return true;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }
}

module.exports = User;
