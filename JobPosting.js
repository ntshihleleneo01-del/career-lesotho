const { db } = require('../firebase-admin');

class JobPosting {
  constructor(data) {
    this.id = data.id || null;
    this.companyId = data.companyId;
    this.title = data.title;
    this.description = data.description;
    this.requirements = data.requirements || {}; // { qualifications: [], experience: '', skills: [] }
    this.location = data.location;
    this.salary = data.salary || {};
    this.employmentType = data.employmentType; // 'full-time', 'part-time', 'contract'
    this.deadline = data.deadline;
    this.status = data.status || 'active'; // 'active', 'closed', 'expired'
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async create(jobData) {
    try {
      const jobRef = db.collection('jobPostings').doc();
      const job = new JobPosting({ ...jobData, id: jobRef.id });
      await jobRef.set({
        ...job,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return job;
    } catch (error) {
      throw new Error(`Error creating job posting: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const jobDoc = await db.collection('jobPostings').doc(id).get();
      if (!jobDoc.exists) {
        return null;
      }
      return new JobPosting({ id: jobDoc.id, ...jobDoc.data() });
    } catch (error) {
      throw new Error(`Error finding job posting: ${error.message}`);
    }
  }

  static async findByCompany(companyId) {
    try {
      const jobsSnapshot = await db.collection('jobPostings').where('companyId', '==', companyId).get();
      return jobsSnapshot.docs.map(doc => new JobPosting({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error finding jobs by company: ${error.message}`);
    }
  }

  static async findActive() {
    try {
      const jobsSnapshot = await db.collection('jobPostings')
        .where('status', '==', 'active')
        .where('deadline', '>', new Date())
        .get();
      return jobsSnapshot.docs.map(doc => new JobPosting({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error finding active jobs: ${error.message}`);
    }
  }

  async update(updateData) {
    try {
      const jobRef = db.collection('jobPostings').doc(this.id);
      await jobRef.update({
        ...updateData,
        updatedAt: new Date()
      });
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating job posting: ${error.message}`);
    }
  }

  async delete() {
    try {
      await db.collection('jobPostings').doc(this.id).delete();
      return true;
    } catch (error) {
      throw new Error(`Error deleting job posting: ${error.message}`);
    }
  }

  // Match applicants based on qualifications
  async findMatchingApplicants() {
    try {
      // Get all students with completed profiles
      const studentsSnapshot = await db.collection('users')
        .where('role', '==', 'student')
        .where('profileComplete', '==', true)
        .get();

      const matchingStudents = [];

      for (const studentDoc of studentsSnapshot.docs) {
        const student = studentDoc.data();
        const studentData = student.studentData || {};

        // Check academic performance
        if (this.requirements.qualifications && !this.checkAcademicMatch(studentData.qualifications)) {
          continue;
        }

        // Check experience
        if (this.requirements.experience && !this.checkExperienceMatch(studentData.experience)) {
          continue;
        }

        // Check skills
        if (this.requirements.skills && !this.checkSkillsMatch(studentData.skills)) {
          continue;
        }

        // Check certificates
        if (this.requirements.certificates && !this.checkCertificatesMatch(studentData.certificates)) {
          continue;
        }

        matchingStudents.push({
          id: studentDoc.id,
          ...student,
          matchScore: this.calculateMatchScore(studentData)
        });
      }

      // Sort by match score
      return matchingStudents.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      throw new Error(`Error finding matching applicants: ${error.message}`);
    }
  }

  checkAcademicMatch(studentQualifications) {
    if (!studentQualifications || !this.requirements.qualifications) return true;

    const requiredQualifications = this.requirements.qualifications;
    return requiredQualifications.every(req => {
      return studentQualifications.some(qual =>
        qual.level === req.level && qual.grade >= req.minimumGrade
      );
    });
  }

  checkExperienceMatch(studentExperience) {
    if (!studentExperience || !this.requirements.experience) return true;

    // Simple check - can be enhanced based on requirements
    return studentExperience.length >= this.requirements.experience;
  }

  checkSkillsMatch(studentSkills) {
    if (!studentSkills || !this.requirements.skills) return true;

    const requiredSkills = this.requirements.skills;
    return requiredSkills.every(skill => studentSkills.includes(skill));
  }

  checkCertificatesMatch(studentCertificates) {
    if (!studentCertificates || !this.requirements.certificates) return true;

    const requiredCertificates = this.requirements.certificates;
    return requiredCertificates.every(cert => studentCertificates.includes(cert));
  }

  calculateMatchScore(studentData) {
    let score = 0;
    const maxScore = 100;

    // Academic match (40%)
    if (this.checkAcademicMatch(studentData.qualifications)) {
      score += 40;
    }

    // Experience match (25%)
    if (this.checkExperienceMatch(studentData.experience)) {
      score += 25;
    }

    // Skills match (20%)
    if (this.checkSkillsMatch(studentData.skills)) {
      score += 20;
    }

    // Certificates match (15%)
    if (this.checkCertificatesMatch(studentData.certificates)) {
      score += 15;
    }

    return Math.min(score, maxScore);
  }
}

module.exports = JobPosting;
