// src/utils/constants.js

export const COLLEGE_DOMAIN = '@aiktc.ac.in';

export const DEPARTMENTS = {
  'Computer Engineering': {
    code: 'COMP',
    semesters: {
      1: ['Engineering Mathematics-I', 'Engineering Physics-I', 'Engineering Chemistry-I', 'Engineering Mechanics', 'Basic Electrical Engineering'],
      2: ['Engineering Mathematics-II', 'Engineering Physics-II', 'Engineering Chemistry-II', 'Engineering Graphics', 'C programming', 'Professional Communication and Ethics-I'],
      3: ['Engineering Mathematics-III', 'Discrete Structures and Graph Theory', 'Data Structure', 'Digital Logic & Computer Architecture', 'Computer Graphics'],
      4: ['Engineering Mathematics-IV', 'Analysis of Algorithm', 'Database Management System', 'Operating System', 'Microprocessor'],
      5: ['Theoretical Computer Science', 'Software Engineering', 'Computer Network', 'Data Warehousing & Mining', 'Internet Programming'],
      6: ['System Programming & Compiler Construction', 'Cryptography & System Security', 'Mobile Computing', 'Artificial Intelligence', 'Internet of Things'],
      7: ['Machine Learning', 'Big Data Analytics', 'Natural Language Processing', 'Block Chain', 'Product Lifecycle Management'],
      8: ['Distributed Computing', 'Deep Learning', 'Optimization in Machine Learning', 'Project Management']
    }
  },
  'Data Science': {
    code: 'DS',
    semesters: {
      1: ['Engineering Mathematics-I', 'Engineering Physics-I', 'Engineering Chemistry-I', 'Engineering Mechanics', 'Basic Electrical Engineering'],
      2: ['Engineering Mathematics-II', 'Engineering Physics-II', 'Engineering Chemistry-II', 'Engineering Graphics', 'C programming', 'Professional Communication and Ethics-I'],
      3: ['Engineering Mathematics-III', 'Discrete Structures and Graph Theory', 'Data Structure', 'Digital Logic & Computer Architecture', 'Computer Graphics'],
      4: ['Engineering Mathematics-IV', 'Analysis of Algorithm', 'Database Management System', 'Operating System', 'Microprocessor'],
      5: ['Computer Network', 'Web Computing', 'Artificial Intelligence', 'DataWarehousing & Mining', 'Statistics for Artificial Intelligence & Data Science'],
      6: ['Data Analytics and Visualization', 'Cryptography and System Security', 'Software Engineering and Project Management', 'Machine Learning', 'Distributed Computing'],
      7: ['Deep Leaning', 'Big Data Analytics', 'Natural Language Processing', 'Blockchain Technologies', 'Product Lifecycle Management'],
      8: ['Advanced Artificial Intelligence', 'Quantum Computing', 'Graph Data Science', 'Project Management']
    }
  },
  'Artificial Intelligence & Machine Learning': {
    code: 'AIML',
    semesters: {
      1: ['Engineering Mathematics-I', 'Engineering Physics-I', 'Engineering Chemistry-I', 'Engineering Mechanics', 'Basic Electrical Engineering'],
      2: ['Engineering Mathematics-II', 'Engineering Physics-II', 'Engineering Chemistry-II', 'Engineering Graphics', 'C programming', 'Professional Communication and Ethics-I'],
     3: ['Engineering Mathematics-III', 'Discrete Structures and Graph Theory', 'Data Structure', 'Digital Logic & Computer Architecture', 'Computer Graphics'],
      4: ['Engineering Mathematics-IV', 'Analysis of Algorithm', 'Database Management System', 'Operating System', 'Microprocessor'],
      5: ['Computer Network', 'Web Computing', 'Artificial Intelligence', 'DataWarehousing & Mining', 'Statistics for Artificial Intelligence & Data Science'],
      6: ['Data Analytics and Visualization', 'Cryptography and System Security', 'Software Engineering and Project Management', 'Machine Learning', 'Distributed Computing'],
      7: ['Deep Leaning', 'Big Data Analytics', 'Natural Language Processing', 'Blockchain Technologies', 'Product Lifecycle Management'],
      8: ['Advanced Artificial Intelligence', 'Quantum Computing', 'Graph Data Science', 'Project Management']
    }
  },
  'Mechanical Engineering': {
    code: 'MECH',
    semesters: {
      1: ['Engineering Mathematics-I', 'Engineering Physics-I', 'Engineering Chemistry-I', 'Engineering Mechanics', 'Basic Electrical Engineering'],
      2: ['Engineering Mathematics-II', 'Engineering Physics-II', 'Engineering Chemistry-II', 'Engineering Graphics', 'C programming', 'Professional Communication and Ethics-I'],
      3: ['Engineering Mathematics-III', 'Strength of Materials', 'Production Processes', 'Materials and Metallurgy', 'Thermodynamics'],
      4: ['Engineering Mathematics-IV', 'Fluid Mechanics', 'Kinematics of Machinery', 'CAD/CAM', 'Industrial Electronics'],
      5: ['Mechanical Measurements and Controls', 'Thermal Engineering', 'Dynamics of Machinery', 'Finite Element Analysis', 'Computational Methods'],
      6: ['Machine Design', 'Turbo Machinery', 'Heating, Ventilation, Air conditioning and Refrigeration', 'Automation and Artificial Intelligence', 'Tool Engineering'],
      7: ['Design of Mechanical System', 'Logistics and Supply Chain Management', 'Automotive Power Systems', 'Machinery Diagnostics', 'Product Lifecycle Management'],
      8: ['Operations Planning and Control', 'Composite Materials', 'Design for X', 'Project Management']
    }
  },
  'Civil Engineering': {
    code: 'CIVIL',
    semesters: {
      1: ['Engineering Mathematics-I', 'Engineering Physics-I', 'Engineering Chemistry-I', 'Engineering Mechanics', 'Basic Electrical Engineering'],
      2: ['Engineering Mathematics-II', 'Engineering Physics-II', 'Engineering Chemistry-II', 'Engineering Graphics', 'C programming', 'Professional Communication and Ethics-I'],
      3: ['Engineering Mathematics-III', 'Mechanics of Solids', 'Engineering Geology', 'Architectural Planning & Design of Buildings', 'Fluid Mechanics- I'],
      4: ['Engineering Mathematics-IV', 'Structural Analysis', 'Surveying', 'Building Materials & Concrete Technology', 'Fluid Mechanics-II'],
      5: ['Theory of Reinforced Concrete Structures', 'Applied Hydraulics', 'Geotechnical Engineering-I', 'Transportation Engineering', 'Building Services & Repairs'],
      6: ['Design & Drawing of Steel Structures', 'Water Resources Engineering', 'Geotechnical Engineering-II', 'Environmental Engineering', 'Rock Mechanics'],
      7: ['Design & Drawing of Reinforced Concrete Structures', 'Quantity Survey, Estimation and Valuation', 'Pre-stressed Concrete', 'Foundation Analysis and Design', 'Product Life-cycle Management'],
      8: ['Construction Management', 'Bridge Engineering', 'Repairs, Rehabilitation and Retrofitting of Structures', 'Project Management']
    }
  }
};

// Legacy support - maintain SEMESTERS for backward compatibility
export const SEMESTERS = DEPARTMENTS['Computer Engineering'].semesters;

// Helper functions
export const getDepartmentNames = () => Object.keys(DEPARTMENTS);

export const getDepartmentCode = (departmentName) => {
  return DEPARTMENTS[departmentName]?.code || '';
};

export const getSemestersForDepartment = (departmentName) => {
  return DEPARTMENTS[departmentName]?.semesters || {};
};

export const getSubjectsForDepartmentSemester = (departmentName, semester) => {
  const departmentData = DEPARTMENTS[departmentName];
  return departmentData?.semesters[semester] || [];
};

export const ACADEMIC_YEARS = [
  '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'
];

export const FILE_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB