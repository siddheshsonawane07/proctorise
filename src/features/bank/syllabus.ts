/**
 * Boards, classes, subjects and chapters for the AI question prompt. A subject without chapters lets
 * the teacher type one. Each list was checked against at least two published listings of the
 * Balbharati textbooks on 2026-11-06 (Shaalaa, Byjus, Embibe, Kitabcd); check the textbook when a new
 * edition comes out.
 */
export type Subject = { id: string; name: string; chapters: string[] };
export type Board = {
  id: string;
  name: string;
  classes: { id: string; name: string; subjects: Subject[] }[];
};

export const BOARDS: Board[] = [
  {
    id: "msbshse",
    name: "Maharashtra State Board (SSC)",
    classes: [
      {
        id: "10",
        name: "Class 10",
        subjects: [
          {
            id: "algebra",
            name: "Mathematics Part 1 (Algebra)",
            chapters: [
              "Linear Equations in Two Variables",
              "Quadratic Equations",
              "Arithmetic Progression",
              "Financial Planning",
              "Probability",
              "Statistics",
            ],
          },
          {
            id: "geometry",
            name: "Mathematics Part 2 (Geometry)",
            chapters: [
              "Similarity",
              "Pythagoras Theorem",
              "Circle",
              "Geometric Constructions",
              "Co-ordinate Geometry",
              "Trigonometry",
              "Mensuration",
            ],
          },
          {
            id: "science-1",
            name: "Science and Technology Part 1",
            chapters: [
              "Gravitation",
              "Periodic Classification of Elements",
              "Chemical Reactions and Equations",
              "Effects of Electric Current",
              "Heat",
              "Refraction of Light",
              "Lenses",
              "Metallurgy",
              "Carbon Compounds",
              "Space Missions",
            ],
          },
          {
            id: "science-2",
            name: "Science and Technology Part 2",
            chapters: [
              "Heredity and Evolution",
              "Life Processes in Living Organisms Part 1",
              "Life Processes in Living Organisms Part 2",
              "Environmental Management",
              "Towards Green Energy",
              "Animal Classification",
              "Introduction to Microbiology",
              "Cell Biology and Biotechnology",
              "Social Health",
              "Disaster Management",
            ],
          },
          {
            id: "history",
            name: "History",
            chapters: [
              "Historiography: Development in the West",
              "Historiography: Indian Tradition",
              "Applied History",
              "History of Indian Arts",
              "Mass Media and History",
              "Entertainment and History",
              "Sports and History",
              "Tourism and History",
              "Heritage Management",
            ],
          },
          {
            id: "political-science",
            name: "Political Science",
            chapters: [
              "Working of the Constitution",
              "The Electoral Process",
              "Political Parties",
              "Social and Political Movements",
              "Challenges faced by Indian Democracy",
            ],
          },
          {
            id: "geography",
            name: "Geography",
            chapters: [
              "Field Visit",
              "Location and Extent",
              "Physiography and Drainage",
              "Climate",
              "Natural Vegetation and Wildlife",
              "Population",
              "Human Settlements",
              "Economy and Occupations",
              "Tourism, Transport and Communication",
            ],
          },
          { id: "english", name: "English", chapters: [] },
          { id: "marathi", name: "Marathi", chapters: [] },
          { id: "hindi", name: "Hindi", chapters: [] },
        ],
      },
    ],
  },
];
