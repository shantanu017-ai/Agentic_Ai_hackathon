import { C10_KC_LABELS, C10_QUESTIONS, C10_TRACK } from "./class10";

export type Difficulty = "easy" | "medium" | "hard";
export type TrackId = "c10-physics" | "sat-math" | "ap-physics-1";

export type Topic = {
  id: string;
  name: string;
  short: string;
  blurb: string;
  prerequisites?: string[];
};

export type Track = {
  id: TrackId;
  name: string;
  shortName: string;
  description: string;
  topics: Topic[];
};

export type Question = {
  id: string;
  trackId: TrackId;
  topicId: string;
  difficulty: Difficulty;
  prompt: string;
  context?: string;
  choices: string[];
  answer: number;
  explanation: string;
  hint: string;
  kc?: string;
  misconceptions?: string[];
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Foundational",
  medium: "Developing",
  hard: "Stretch",
};

export const DIFFICULTY_VALUE: Record<Difficulty, number> = {
  easy: 25,
  medium: 50,
  hard: 75,
};

export const TRACKS: Track[] = [
  C10_TRACK,
  {
    id: "sat-math",
    name: "SAT Math",
    shortName: "SAT",
    description:
      "Five skill areas drawn from the SAT Math sections. Calculator-free reasoning, with worked explanations for every item.",
    topics: [
      {
        id: "linear",
        name: "Linear equations & inequalities",
        short: "Linear",
        blurb: "Slope, intercepts, systems, and translating word problems into equations.",
        prerequisites: [],
      },
      {
        id: "quadratics",
        name: "Quadratics & polynomials",
        short: "Quadratics",
        blurb: "Factoring, zeros, vertices, discriminants, and polynomial structure.",
        prerequisites: ["linear"],
      },
      {
        id: "rates",
        name: "Ratios, rates & percentages",
        short: "Rates",
        blurb: "Proportional reasoning, percent change, work rates, and mixtures.",
        prerequisites: ["linear"],
      },
      {
        id: "data",
        name: "Data analysis & probability",
        short: "Data",
        blurb: "Center, spread, conditional probability, and reading data honestly.",
        prerequisites: ["rates"],
      },
      {
        id: "geometry",
        name: "Geometry & trigonometry",
        short: "Geometry",
        blurb: "Triangles, circles, solids, similarity, and right-triangle ratios.",
        prerequisites: ["linear"],
      },
    ],
  },
  {
    id: "ap-physics-1",
    name: "AP Physics 1",
    shortName: "Physics",
    description:
      "Four core units from AP Physics 1. Algebra-based reasoning with units, diagrams, and Newton's laws.",
    topics: [
      {
        id: "kinematics",
        name: "Kinematics",
        short: "Motion",
        blurb: "Position, velocity, acceleration, and projectile motion.",
        prerequisites: [],
      },
      {
        id: "dynamics",
        name: "Forces & Newton's laws",
        short: "Forces",
        blurb: "Free-body reasoning, friction, tension, and elevator problems.",
        prerequisites: ["kinematics"],
      },
      {
        id: "energy",
        name: "Energy & momentum",
        short: "Energy",
        blurb: "Work, conservation of energy, springs, and collisions.",
        prerequisites: ["dynamics"],
      },
      {
        id: "circuits",
        name: "Circuits",
        short: "Circuits",
        blurb: "Ohm's law, series and parallel networks, and electrical power.",
        prerequisites: [],
      },
    ],
  },
];

const CORE_KC_LABELS: Record<string, string> = {
  "linear-equations": "Solving linear equations",
  slope: "Slope and rate of change",
  "linear-modeling": "Modeling with linear functions",
  "systems-of-equations": "Systems and parallel lines",
  "factored-roots": "Zero product property",
  "vertex-form": "Vertex form and maximum height",
  discriminant: "The discriminant",
  factoring: "Factoring quadratics",
  "perfect-squares": "Perfect-square structure",
  proportions: "Proportional reasoning",
  percentages: "Percent of a quantity",
  "percent-change": "Successive percent change",
  "work-rates": "Work-rate problems",
  "mixture-problems": "Mixture problems",
  "relative-speed": "Relative speed and catch-up",
  mean: "Mean",
  probability: "Single-event probability",
  median: "Median",
  spread: "Center versus spread",
  "conditional-probability": "Conditional probability",
  pythagorean: "Pythagorean theorem",
  "circle-measurement": "Circle area and circumference",
  "triangle-angles": "Triangle angle sums",
  "solid-volume": "Volume of solids",
  "trig-ratios": "Right-triangle trig ratios",
  "similarity-scaling": "Scaling lengths and areas",
  "motion-equations": "Constant-acceleration equations",
  "free-fall": "Free fall",
  displacement: "Signed displacement",
  "projectile-motion": "Projectile motion",
  "motion-derivatives": "Velocity and acceleration calculus",
  "newtons-second-law": "Newton's second law",
  "newtons-third-law": "Newton's third law pairs",
  friction: "Static friction",
  "apparent-weight": "Apparent weight in an elevator",
  "tension-systems": "Connected systems and tension",
  "kinetic-energy": "Kinetic energy",
  work: "Work done by a force",
  "energy-conservation": "Conservation of energy",
  "spring-energy": "Elastic potential energy",
  momentum: "Momentum in collisions",
  "ohms-law": "Ohm's law",
  "series-circuits": "Series circuits",
  "parallel-circuits": "Parallel circuits",
  "electrical-power": "Electrical power",
};

const CORE_QUESTIONS: Question[] = [
  // SAT Math — Linear equations & inequalities
  {
    id: "lin-1",
    trackId: "sat-math",
    topicId: "linear",
    kc: "linear-equations",
    difficulty: "easy",
    prompt: "If 3x + 7 = 22, what is the value of x?",
    choices: ["3", "5", "7", "15"],
    answer: 1,
    explanation:
      "Subtract 7 from both sides to get 3x = 15. Divide by 3 to get x = 5.",
    hint: "Undo the addition before the multiplication.",
  },
  {
    id: "lin-2",
    trackId: "sat-math",
    topicId: "linear",
    kc: "slope",
    difficulty: "easy",
    prompt: "A line passes through (0, 2) and (4, 10). What is its slope?",
    choices: ["1/2", "2", "4", "8"],
    answer: 1,
    explanation:
      "Slope is the change in y over the change in x: (10 − 2) / (4 − 0) = 8 / 4 = 2.",
    hint: "Slope compares the vertical change to the horizontal change.",
  },
  {
    id: "lin-3",
    trackId: "sat-math",
    topicId: "linear",
    kc: "linear-modeling",
    difficulty: "medium",
    prompt:
      "A gym charges a $25 joining fee plus $18 per month. Which equation gives the total cost C, in dollars, after m months?",
    choices: ["C = 25m + 18", "C = 18m + 25", "C = 43m", "C = 18(m + 25)"],
    answer: 1,
    explanation:
      "The joining fee is charged once, so it is the constant. The monthly charge is 18 per month, so the total is C = 18m + 25.",
    hint: "Decide which amount repeats and which happens only once.",
  },
  {
    id: "lin-4",
    trackId: "sat-math",
    topicId: "linear",
    kc: "linear-equations",
    difficulty: "medium",
    prompt:
      "Using the gym plan from the previous item — $25 to join and $18 per month — after how many months does the total reach $151?",
    choices: ["5", "6", "7", "8"],
    answer: 2,
    explanation:
      "Solve 18m + 25 = 151. Subtract 25: 18m = 126. Divide by 18: m = 7.",
    hint: "Remove the one-time fee first, then divide.",
  },
  {
    id: "lin-5",
    trackId: "sat-math",
    topicId: "linear",
    kc: "systems-of-equations",
    difficulty: "hard",
    prompt:
      "The system y = 2x + 3 and y = kx − 1 has no solution. What is the value of k?",
    choices: ["−2", "1/2", "2", "3"],
    answer: 2,
    explanation:
      "A linear system has no solution when the lines are parallel: the slopes match but the intercepts differ. Both lines must have slope 2, so k = 2. The intercepts 3 and −1 are different, confirming there is no intersection.",
    hint: "“No solution” means two parallel lines.",
  },
  {
    id: "lin-6",
    trackId: "sat-math",
    topicId: "linear",
    kc: "linear-modeling",
    difficulty: "hard",
    prompt:
      "A phone plan costs $35 per month plus $0.08 per minute for every minute over 500. One bill was $59. How many total minutes were used?",
    choices: ["300", "675", "750", "800"],
    answer: 3,
    explanation:
      "The overage charge is 59 − 35 = $24. At $0.08 per minute, that is 24 ÷ 0.08 = 300 overage minutes. Add the included 500 minutes: 300 + 500 = 800 total minutes.",
    hint: "Find the overage charge, then add back the included minutes.",
  },

  // SAT Math — Quadratics & polynomials
  {
    id: "quad-1",
    trackId: "sat-math",
    topicId: "quadratics",
    kc: "factored-roots",
    difficulty: "easy",
    prompt: "What are the solutions of (x − 3)(x + 5) = 0?",
    choices: [
      "x = 3 and x = −5",
      "x = −3 and x = 5",
      "x = 3 and x = 5",
      "x = −3 and x = −5",
    ],
    answer: 0,
    explanation:
      "A product is zero when either factor is zero. x − 3 = 0 gives x = 3, and x + 5 = 0 gives x = −5.",
    hint: "Set each factor equal to zero — the zero product property.",
  },
  {
    id: "quad-2",
    trackId: "sat-math",
    topicId: "quadratics",
    kc: "vertex-form",
    difficulty: "easy",
    prompt: "What is the vertex of the parabola y = (x − 2)² + 4?",
    choices: ["(2, 4)", "(−2, 4)", "(2, −4)", "(4, 2)"],
    answer: 0,
    explanation:
      "In vertex form y = (x − h)² + k, the vertex is (h, k). Here h = 2 and k = 4, so the vertex is (2, 4).",
    hint: "Read the vertex directly from vertex form, watching the sign of h.",
  },
  {
    id: "quad-3",
    trackId: "sat-math",
    topicId: "quadratics",
    kc: "discriminant",
    difficulty: "medium",
    prompt: "How many real solutions does x² + 6x + 10 = 0 have?",
    choices: ["0", "1", "2", "Infinitely many"],
    answer: 0,
    explanation:
      "Check the discriminant: b² − 4ac = 36 − 4(1)(10) = −4. A negative discriminant means there are no real solutions.",
    hint: "The discriminant b² − 4ac decides how many real roots exist.",
  },
  {
    id: "quad-4",
    trackId: "sat-math",
    topicId: "quadratics",
    kc: "factoring",
    difficulty: "medium",
    prompt: "What are the zeros of f(x) = x² − 4x − 12?",
    choices: [
      "x = 6 and x = −2",
      "x = −6 and x = 2",
      "x = 3 and x = −4",
      "x = 12 and x = −1",
    ],
    answer: 0,
    explanation:
      "Factor by finding two numbers that multiply to −12 and add to −4: −6 and 2. So f(x) = (x − 6)(x + 2), giving zeros at x = 6 and x = −2.",
    hint: "Look for two numbers with product −12 and sum −4.",
  },
  {
    id: "quad-5",
    trackId: "sat-math",
    topicId: "quadratics",
    kc: "perfect-squares",
    difficulty: "hard",
    prompt:
      "If x² + bx + 16 is a perfect square for a real number b, which could be the value of b?",
    choices: ["−8 only", "8 only", "8 or −8", "16"],
    answer: 2,
    explanation:
      "Write the perfect square as (x + c)² = x² + 2cx + c². Matching c² = 16 gives c = 4 or c = −4. Then b = 2c, so b = 8 or b = −8.",
    hint: "Expand (x + c)² and match the constant term.",
  },
  {
    id: "quad-6",
    trackId: "sat-math",
    topicId: "quadratics",
    kc: "vertex-form",
    difficulty: "hard",
    prompt:
      "A ball is launched so that its height is h(t) = −16t² + 64t + 5 feet after t seconds. What is its maximum height?",
    choices: ["5 ft", "64 ft", "69 ft", "133 ft"],
    answer: 2,
    explanation:
      "The maximum occurs at t = −b / (2a) = −64 / (2 × −16) = 2 seconds. Then h(2) = −16(4) + 64(2) + 5 = −64 + 128 + 5 = 69 feet.",
    hint: "The vertex of a downward parabola is at t = −b / (2a).",
  },

  // SAT Math — Ratios, rates & percentages
  {
    id: "rate-1",
    trackId: "sat-math",
    topicId: "rates",
    kc: "proportions",
    difficulty: "easy",
    prompt:
      "A recipe uses 3 cups of flour for every 2 cups of sugar. If you use 9 cups of flour, how many cups of sugar do you need?",
    choices: ["4", "6", "7.5", "13.5"],
    answer: 1,
    explanation:
      "Set up the proportion 3 / 2 = 9 / s. Cross-multiply: 3s = 18, so s = 6 cups.",
    hint: "Write the ratio as a proportion and scale both parts.",
  },
  {
    id: "rate-2",
    trackId: "sat-math",
    topicId: "rates",
    kc: "percentages",
    difficulty: "easy",
    prompt: "What is 15% of 240?",
    choices: ["24", "36", "42", "160"],
    answer: 1,
    explanation:
      "15% of 240 is 0.15 × 240 = 36. A quick check: 10% is 24 and 5% is 12, and 24 + 12 = 36.",
    hint: "Split 15% into 10% plus 5%.",
  },
  {
    id: "rate-3",
    trackId: "sat-math",
    topicId: "rates",
    kc: "percent-change",
    difficulty: "medium",
    prompt:
      "A price is increased by 20% and then decreased by 20%. What is the net change from the original price?",
    choices: ["Increase of 4%", "Decrease of 4%", "No change", "Decrease of 20%"],
    answer: 1,
    explanation:
      "Multiply the factors: 1.20 × 0.80 = 0.96. The final price is 96% of the original, a 4% decrease. The percents are taken from different bases.",
    hint: "Multiply the percent-change factors instead of adding them.",
  },
  {
    id: "rate-4",
    trackId: "sat-math",
    topicId: "rates",
    kc: "work-rates",
    difficulty: "medium",
    prompt:
      "Five workers can build a wall in 12 days. At the same rate, how long would eight workers take?",
    choices: ["6 days", "7.5 days", "8 days", "19.2 days"],
    answer: 1,
    explanation:
      "The job takes 5 × 12 = 60 worker-days. With 8 workers, 60 ÷ 8 = 7.5 days.",
    hint: "The total amount of work stays constant.",
  },
  {
    id: "rate-5",
    trackId: "sat-math",
    topicId: "rates",
    kc: "mixture-problems",
    difficulty: "hard",
    prompt:
      "A 10-liter solution is 20% acid. How many liters of pure acid must be added to make a 40% acid solution?",
    choices: ["10/3 L", "4 L", "5 L", "20/3 L"],
    answer: 0,
    explanation:
      "The solution starts with 0.20 × 10 = 2 L of acid. Add x liters of pure acid: the acid amount becomes 2 + x and the total volume becomes 10 + x. Solve (2 + x) / (10 + x) = 0.40: 2 + x = 4 + 0.4x, so 0.6x = 2 and x = 10/3 liters.",
    hint: "Track the liters of acid and the total liters separately.",
  },
  {
    id: "rate-6",
    trackId: "sat-math",
    topicId: "rates",
    kc: "relative-speed",
    difficulty: "hard",
    prompt:
      "Train A leaves a station traveling 60 mph. Thirty minutes later, Train B leaves on the same route at 80 mph. How long after B leaves will B catch A?",
    choices: ["0.75 h", "1.5 h", "2 h", "3 h"],
    answer: 1,
    explanation:
      "In the first 0.5 hour, Train A travels 60 × 0.5 = 30 miles. Train B closes the gap at 80 − 60 = 20 mph, so it takes 30 ÷ 20 = 1.5 hours.",
    hint: "Start with the distance gap, then use the relative speed.",
  },

  // SAT Math — Data analysis & probability
  {
    id: "data-1",
    trackId: "sat-math",
    topicId: "data",
    kc: "mean",
    difficulty: "easy",
    prompt: "What is the mean of 4, 6, 8, 10, and 12?",
    choices: ["6", "8", "9", "10"],
    answer: 1,
    explanation:
      "The sum is 4 + 6 + 8 + 10 + 12 = 40. Dividing by 5 values gives a mean of 8.",
    hint: "Add the values, then divide by how many there are.",
  },
  {
    id: "data-2",
    trackId: "sat-math",
    topicId: "data",
    kc: "probability",
    difficulty: "easy",
    prompt:
      "A fair six-sided die is rolled once. What is the probability of rolling an even number?",
    choices: ["1/6", "1/3", "1/2", "2/3"],
    answer: 2,
    explanation:
      "The even outcomes are 2, 4, and 6 — three of the six equally likely outcomes. The probability is 3/6 = 1/2.",
    hint: "Count the even faces and divide by six.",
  },
  {
    id: "data-3",
    trackId: "sat-math",
    topicId: "data",
    kc: "median",
    difficulty: "medium",
    prompt: "What is the median of 3, 7, 8, 10, 14, and 20?",
    choices: ["8", "9", "10", "12"],
    answer: 1,
    explanation:
      "With six values, the median is the mean of the two middle values, 8 and 10: (8 + 10) / 2 = 9.",
    hint: "For an even number of values, average the two middle ones.",
  },
  {
    id: "data-4",
    trackId: "sat-math",
    topicId: "data",
    kc: "probability",
    difficulty: "medium",
    prompt:
      "A bag contains 4 red and 6 blue marbles. Two are drawn without replacement. What is the probability that the first is red and the second is blue?",
    choices: ["2/5", "4/15", "6/25", "3/5"],
    answer: 1,
    explanation:
      "The first draw is red with probability 4/10. Then 9 marbles remain, 6 of them blue, so the second draw is blue with probability 6/9. Multiply: (4/10) × (6/9) = 24/90 = 4/15.",
    hint: "The second draw happens from a smaller bag.",
  },
  {
    id: "data-5",
    trackId: "sat-math",
    topicId: "data",
    kc: "spread",
    difficulty: "hard",
    prompt:
      "A data set has a mean of 50 and a standard deviation of 5. If 7 is added to every value in the set, what are the new mean and standard deviation?",
    choices: [
      "Mean 57, standard deviation 5",
      "Mean 50, standard deviation 12",
      "Mean 57, standard deviation 12",
      "Mean 57, standard deviation 7",
    ],
    answer: 0,
    explanation:
      "Adding a constant shifts every value, so the mean increases by 7 to 57. The distances between values do not change, so the standard deviation stays 5.",
    hint: "A shift moves the center but does not stretch the spread.",
  },
  {
    id: "data-6",
    trackId: "sat-math",
    topicId: "data",
    kc: "conditional-probability",
    difficulty: "hard",
    prompt:
      "In a group of students, 60% passed math, 50% passed physics, and 30% passed both. Given that a student passed math, what is the probability they also passed physics?",
    choices: ["0.18", "0.30", "0.50", "0.80"],
    answer: 2,
    explanation:
      "This is conditional probability. Divide the overlap by the given group: P(physics | math) = 0.30 / 0.60 = 0.50.",
    hint: "The denominator is the group you are told about, not everyone.",
  },

  // SAT Math — Geometry & trigonometry
  {
    id: "geo-1",
    trackId: "sat-math",
    topicId: "geometry",
    kc: "pythagorean",
    difficulty: "easy",
    prompt:
      "A right triangle has legs of length 3 and 4. What is the length of the hypotenuse?",
    choices: ["5", "6", "7", "25"],
    answer: 0,
    explanation:
      "The Pythagorean theorem gives 3² + 4² = c², so 9 + 16 = 25 and c = 5.",
    hint: "Use a² + b² = c² and take the square root.",
  },
  {
    id: "geo-2",
    trackId: "sat-math",
    topicId: "geometry",
    kc: "circle-measurement",
    difficulty: "easy",
    prompt: "What is the area of a circle with radius 3?",
    choices: ["3π", "6π", "9π", "18π"],
    answer: 2,
    explanation: "Area = πr² = π(3)² = 9π.",
    hint: "Square the radius, then multiply by π.",
  },
  {
    id: "geo-3",
    trackId: "sat-math",
    topicId: "geometry",
    kc: "triangle-angles",
    difficulty: "medium",
    prompt:
      "The angles of a triangle measure 2x, 3x, and 4x degrees. What is the measure of the largest angle?",
    choices: ["40°", "60°", "80°", "120°"],
    answer: 2,
    explanation:
      "The angles sum to 180°: 2x + 3x + 4x = 9x = 180, so x = 20. The largest angle is 4x = 80°.",
    hint: "Start with the fact that a triangle's angles sum to 180°.",
  },
  {
    id: "geo-4",
    trackId: "sat-math",
    topicId: "geometry",
    kc: "solid-volume",
    difficulty: "medium",
    prompt:
      "A right circular cylinder has radius 2 and height 5. What is its volume?",
    choices: ["10π", "20π", "25π", "40π"],
    answer: 1,
    explanation: "Volume = πr²h = π(2²)(5) = 20π.",
    hint: "The base area is πr²; multiply by the height.",
  },
  {
    id: "geo-5",
    trackId: "sat-math",
    topicId: "geometry",
    kc: "trig-ratios",
    difficulty: "hard",
    prompt:
      "In a right triangle, sin θ = 3/5. What is cos θ?",
    choices: ["3/4", "4/5", "5/4", "4/3"],
    answer: 1,
    explanation:
      "Sine is opposite over hypotenuse, so the opposite side is 3 and the hypotenuse is 5. The adjacent side is 4 (a 3-4-5 triangle), so cos θ = 4/5.",
    hint: "Use a 3-4-5 right triangle and the cosine ratio.",
  },
  {
    id: "geo-6",
    trackId: "sat-math",
    topicId: "geometry",
    kc: "similarity-scaling",
    difficulty: "hard",
    prompt:
      "Two similar triangles have a side-length ratio of 2:3. What is the ratio of their areas?",
    choices: ["2:3", "3:2", "4:9", "8:27"],
    answer: 2,
    explanation:
      "Areas of similar figures scale by the square of the linear scale factor: (2/3)² = 4/9.",
    hint: "Area scales by the square of the length ratio.",
  },

  // AP Physics 1 — Kinematics
  {
    id: "kin-1",
    trackId: "ap-physics-1",
    topicId: "kinematics",
    kc: "motion-equations",
    difficulty: "easy",
    prompt:
      "A car starts from rest and accelerates at 2 m/s² for 5 s. What is its final speed?",
    choices: ["2 m/s", "5 m/s", "10 m/s", "25 m/s"],
    answer: 2,
    explanation: "Using v = u + at with u = 0: v = 0 + (2)(5) = 10 m/s.",
    hint: "Final speed equals acceleration multiplied by time when starting from rest.",
  },
  {
    id: "kin-2",
    trackId: "ap-physics-1",
    topicId: "kinematics",
    kc: "free-fall",
    difficulty: "easy",
    prompt:
      "An object is dropped from rest near Earth's surface, where g = 10 m/s². Ignoring air resistance, what is its speed after 2 s?",
    choices: ["5 m/s", "10 m/s", "20 m/s", "40 m/s"],
    answer: 2,
    explanation: "v = gt = (10)(2) = 20 m/s.",
    hint: "Free fall is constant acceleration at g.",
  },
  {
    id: "kin-3",
    trackId: "ap-physics-1",
    topicId: "kinematics",
    kc: "motion-equations",
    difficulty: "medium",
    prompt:
      "A ball is thrown straight up with an initial speed of 20 m/s. Using g = 10 m/s², how long does it take to reach its highest point?",
    choices: ["1 s", "2 s", "4 s", "20 s"],
    answer: 1,
    explanation:
      "At the highest point the velocity is zero. Solve 0 = 20 − 10t, so t = 2 s.",
    hint: "At the top, vertical velocity is momentarily zero.",
  },
  {
    id: "kin-4",
    trackId: "ap-physics-1",
    topicId: "kinematics",
    kc: "displacement",
    difficulty: "medium",
    prompt:
      "A cart moves at 4 m/s in the positive direction for 3 s, then at 2 m/s in the negative direction for 2 s. What is its net displacement?",
    choices: ["4 m", "8 m", "12 m", "16 m"],
    answer: 1,
    explanation:
      "First segment: (4)(3) = +12 m. Second segment: (−2)(2) = −4 m. Net displacement = 12 − 4 = 8 m.",
    hint: "Displacement is signed; subtract motion in the opposite direction.",
  },
  {
    id: "kin-5",
    trackId: "ap-physics-1",
    topicId: "kinematics",
    kc: "projectile-motion",
    difficulty: "hard",
    prompt:
      "A ball rolls off a 45 m cliff horizontally at 15 m/s. Using g = 10 m/s², how far from the base of the cliff does it land?",
    choices: ["15 m", "30 m", "45 m", "60 m"],
    answer: 2,
    explanation:
      "Vertical motion is independent: 45 = ½(10)t², so t = 3 s. Horizontal distance = (15)(3) = 45 m.",
    hint: "Find the fall time from the vertical motion first.",
  },
  {
    id: "kin-6",
    trackId: "ap-physics-1",
    topicId: "kinematics",
    kc: "motion-derivatives",
    difficulty: "hard",
    prompt:
      "A cart's velocity is given by v(t) = 3t² m/s for t ≥ 0. What is its acceleration at t = 2 s?",
    choices: ["6 m/s²", "12 m/s²", "18 m/s²", "24 m/s²"],
    answer: 1,
    explanation:
      "Acceleration is the rate of change of velocity: a(t) = dv/dt = 6t. At t = 2 s, a = 12 m/s².",
    hint: "Differentiate the velocity function.",
  },

  // AP Physics 1 — Forces & Newton's laws
  {
    id: "dyn-1",
    trackId: "ap-physics-1",
    topicId: "dynamics",
    kc: "newtons-second-law",
    difficulty: "easy",
    prompt: "A 5 kg object accelerates at 4 m/s². What is the net force on it?",
    choices: ["1.25 N", "9 N", "20 N", "80 N"],
    answer: 2,
    explanation: "Newton's second law: F_net = ma = (5)(4) = 20 N.",
    hint: "Multiply mass by acceleration.",
  },
  {
    id: "dyn-2",
    trackId: "ap-physics-1",
    topicId: "dynamics",
    kc: "newtons-third-law",
    difficulty: "easy",
    prompt:
      "A book rests on a table. Which force is the Newton's-third-law partner of the table pushing up on the book?",
    choices: [
      "Earth pulling down on the book",
      "The book pushing down on the table",
      "The book's weight measured by a scale",
      "Friction between the book and the table",
    ],
    answer: 1,
    explanation:
      "Third-law pairs act on different objects. The partner of the table pushing up on the book is the book pushing down on the table. The book's weight is a separate gravitational force.",
    hint: "A third-law pair exchanges forces between the same two objects.",
  },
  {
    id: "dyn-3",
    trackId: "ap-physics-1",
    topicId: "dynamics",
    kc: "friction",
    difficulty: "medium",
    prompt:
      "A 10 kg block rests on a surface with coefficient of static friction 0.30. Using g = 10 m/s², what is the maximum static friction force?",
    choices: ["3 N", "10 N", "30 N", "100 N"],
    answer: 2,
    explanation:
      "Maximum static friction is μ_s N. The normal force equals the weight, N = mg = 100 N, so f_max = (0.30)(100) = 30 N.",
    hint: "Find the normal force from the block's weight first.",
  },
  {
    id: "dyn-4",
    trackId: "ap-physics-1",
    topicId: "dynamics",
    kc: "apparent-weight",
    difficulty: "medium",
    prompt:
      "A 60 kg person stands on a scale in an elevator. The scale reads 720 N. Using g = 10 m/s², what is the elevator's acceleration?",
    choices: ["1 m/s² up", "2 m/s² up", "2 m/s² down", "12 m/s² up"],
    answer: 1,
    explanation:
      "The net force is N − mg = 720 − 600 = 120 N upward. Then a = F_net / m = 120 / 60 = 2 m/s², and the reading is greater than the weight, so the acceleration is upward.",
    hint: "Compare the scale reading to the person's weight.",
  },
  {
    id: "dyn-5",
    trackId: "ap-physics-1",
    topicId: "dynamics",
    kc: "tension-systems",
    difficulty: "hard",
    prompt:
      "Two blocks, 3 kg and 5 kg, are connected by a string on a frictionless floor. A 16 N force pulls the 5 kg block to the right. What is the tension in the string?",
    choices: ["6 N", "8 N", "10 N", "16 N"],
    answer: 0,
    explanation:
      "The whole system accelerates at a = 16 / (3 + 5) = 2 m/s². The string only accelerates the 3 kg block, so T = (3)(2) = 6 N.",
    hint: "Find the system acceleration, then apply F = ma to just the trailing block.",
  },
  {
    id: "dyn-6",
    trackId: "ap-physics-1",
    topicId: "dynamics",
    kc: "tension-systems",
    difficulty: "hard",
    prompt:
      "Masses of 4 kg and 6 kg hang over a frictionless pulley. Using g = 10 m/s², what is the magnitude of their acceleration?",
    choices: ["1 m/s²", "2 m/s²", "5 m/s²", "10 m/s²"],
    answer: 1,
    explanation:
      "For an Atwood machine, a = (m₂ − m₁)g / (m₁ + m₂) = (2)(10) / 10 = 2 m/s².",
    hint: "The net driving force comes from the weight difference.",
  },

  // AP Physics 1 — Energy & momentum
  {
    id: "en-1",
    trackId: "ap-physics-1",
    topicId: "energy",
    kc: "kinetic-energy",
    difficulty: "easy",
    prompt: "What is the kinetic energy of a 2 kg object moving at 3 m/s?",
    choices: ["3 J", "6 J", "9 J", "18 J"],
    answer: 2,
    explanation: "KE = ½mv² = ½(2)(3²) = 9 J.",
    hint: "Square the speed before multiplying.",
  },
  {
    id: "en-2",
    trackId: "ap-physics-1",
    topicId: "energy",
    kc: "work",
    difficulty: "easy",
    prompt:
      "A constant 10 N force pushes an object 5 m in the direction of the force. How much work is done?",
    choices: ["2 J", "5 J", "50 J", "500 J"],
    answer: 2,
    explanation: "W = Fd cos θ. With force and displacement aligned, W = (10)(5) = 50 J.",
    hint: "Work is force times the displacement in its direction.",
  },
  {
    id: "en-3",
    trackId: "ap-physics-1",
    topicId: "energy",
    kc: "energy-conservation",
    difficulty: "medium",
    prompt:
      "A 1 kg object is dropped from a height of 5 m. Using g = 10 m/s² and ignoring air resistance, what is its speed just before impact?",
    choices: ["5 m/s", "10 m/s", "50 m/s", "100 m/s"],
    answer: 1,
    explanation:
      "Conserving energy: mgh = ½mv², so v = √(2gh) = √(2 × 10 × 5) = 10 m/s. The mass cancels.",
    hint: "Set gravitational potential energy equal to kinetic energy.",
  },
  {
    id: "en-4",
    trackId: "ap-physics-1",
    topicId: "energy",
    kc: "spring-energy",
    difficulty: "medium",
    prompt:
      "A spring with spring constant k = 200 N/m is compressed 0.1 m. How much elastic potential energy is stored?",
    choices: ["0.1 J", "1 J", "10 J", "20 J"],
    answer: 1,
    explanation: "U = ½kx² = ½(200)(0.1)² = ½(200)(0.01) = 1 J.",
    hint: "The compression is squared.",
  },
  {
    id: "en-5",
    trackId: "ap-physics-1",
    topicId: "energy",
    kc: "momentum",
    difficulty: "hard",
    prompt:
      "A 2 kg cart moving at 3 m/s collides with a stationary 4 kg cart and they stick together. What is their common speed after the collision?",
    choices: ["0.5 m/s", "1 m/s", "1.5 m/s", "3 m/s"],
    answer: 1,
    explanation:
      "Momentum is conserved: (2)(3) + 0 = (2 + 4)v, so 6 = 6v and v = 1 m/s. Kinetic energy is not conserved in an inelastic collision.",
    hint: "Use conservation of momentum for the combined cart.",
  },
  {
    id: "en-6",
    trackId: "ap-physics-1",
    topicId: "energy",
    kc: "energy-conservation",
    difficulty: "hard",
    prompt:
      "A 500 kg coaster car starts from rest 20 m above the bottom of a frictionless track. Using g = 10 m/s², what is its speed at a point 5 m above the bottom?",
    choices: ["10 m/s", "15 m/s", "17.3 m/s", "20 m/s"],
    answer: 2,
    explanation:
      "The car descends 20 − 5 = 15 m. Energy conservation gives ½v² = gΔh = 150, so v = √300 ≈ 17.3 m/s.",
    hint: "Only the change in height matters, not the total height.",
  },

  // AP Physics 1 — Circuits
  {
    id: "cir-1",
    trackId: "ap-physics-1",
    topicId: "circuits",
    kc: "ohms-law",
    difficulty: "easy",
    prompt:
      "A 12 V battery is connected across a 4 Ω resistor. What current flows through the resistor?",
    choices: ["0.33 A", "3 A", "8 A", "48 A"],
    answer: 1,
    explanation: "Ohm's law: I = V / R = 12 / 4 = 3 A.",
    hint: "Divide voltage by resistance.",
  },
  {
    id: "cir-2",
    trackId: "ap-physics-1",
    topicId: "circuits",
    kc: "series-circuits",
    difficulty: "easy",
    prompt:
      "Two 6 Ω resistors are connected in series. What is the equivalent resistance?",
    choices: ["3 Ω", "6 Ω", "12 Ω", "36 Ω"],
    answer: 2,
    explanation:
      "In series, resistances add: 6 + 6 = 12 Ω. The same current passes through both.",
    hint: "Series resistances simply add.",
  },
  {
    id: "cir-3",
    trackId: "ap-physics-1",
    topicId: "circuits",
    kc: "parallel-circuits",
    difficulty: "medium",
    prompt:
      "Two 6 Ω resistors are connected in parallel. What is the equivalent resistance?",
    choices: ["3 Ω", "6 Ω", "12 Ω", "36 Ω"],
    answer: 0,
    explanation:
      "For parallel resistors: 1/R = 1/6 + 1/6 = 2/6, so R = 3 Ω. Two equal resistors in parallel give half the individual resistance.",
    hint: "Use reciprocals for parallel resistance.",
  },
  {
    id: "cir-4",
    trackId: "ap-physics-1",
    topicId: "circuits",
    kc: "series-circuits",
    difficulty: "medium",
    prompt:
      "A 9 V battery is connected to a 3 Ω and a 6 Ω resistor in series. What is the voltage across the 6 Ω resistor?",
    choices: ["3 V", "4.5 V", "6 V", "9 V"],
    answer: 2,
    explanation:
      "The total resistance is 9 Ω, so the current is I = 9 / 9 = 1 A. The voltage across the 6 Ω resistor is V = IR = (1)(6) = 6 V.",
    hint: "Find the series current first, then apply Ohm's law to one resistor.",
  },
  {
    id: "cir-5",
    trackId: "ap-physics-1",
    topicId: "circuits",
    kc: "electrical-power",
    difficulty: "hard",
    prompt:
      "A current of 2 A flows through a 4 Ω resistor. How much power is dissipated?",
    choices: ["2 W", "8 W", "16 W", "32 W"],
    answer: 2,
    explanation: "P = I²R = (2²)(4) = 16 W.",
    hint: "Use the power form that starts with current and resistance.",
  },
  {
    id: "cir-6",
    trackId: "ap-physics-1",
    topicId: "circuits",
    kc: "parallel-circuits",
    difficulty: "hard",
    prompt:
      "A 12 V battery is connected across a 4 Ω and a 12 Ω resistor in parallel. What is the total current drawn from the battery?",
    choices: ["1 A", "3 A", "4 A", "16 A"],
    answer: 2,
    explanation:
      "Parallel equivalent: 1/R = 1/4 + 1/12 = 4/12, so R = 3 Ω. Total current I = V / R = 12 / 3 = 4 A. You can also add branch currents: 3 A + 1 A = 4 A.",
    hint: "Reduce the parallel network to one resistance, or add the branch currents.",
  },
];

export const QUESTIONS: Question[] = [...C10_QUESTIONS, ...CORE_QUESTIONS];

export const TRACK_BY_ID: Record<TrackId, Track> = Object.fromEntries(
  TRACKS.map((track) => [track.id, track]),
) as Record<TrackId, Track>;

export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries(
  TRACKS.flatMap((track) =>
    track.topics.map((topic) => [topic.id, topic] as const),
  ),
);

export function questionsFor(trackId: TrackId, topicId?: string) {
  return QUESTIONS.filter(
    (question) =>
      question.trackId === trackId && (!topicId || question.topicId === topicId),
  );
}

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((question) => [question.id, question] as const),
);

export function countByDifficulty(trackId: TrackId, topicId: string) {
  const items = questionsFor(trackId, topicId);
  return {
    total: items.length,
    easy: items.filter((item) => item.difficulty === "easy").length,
    medium: items.filter((item) => item.difficulty === "medium").length,
    hard: items.filter((item) => item.difficulty === "hard").length,
  };
}

export function questionKcs(question: Question): string[] {
  return question.kc ? [question.kc] : [question.topicId];
}

export function kcLabel(id: string): string {
  return (
    C10_KC_LABELS[id] ??
    CORE_KC_LABELS[id] ??
    TOPIC_BY_ID[id]?.name ??
    id.replace(/-/g, " ")
  );
}

export function topicKcs(topicId: string): string[] {
  const ids = new Set<string>();
  for (const question of QUESTIONS) {
    if (question.topicId !== topicId) continue;
    for (const kc of questionKcs(question)) ids.add(kc);
  }
  return [...ids];
}

export function trackKcs(trackId: TrackId): string[] {
  const ids = new Set<string>();
  for (const question of QUESTIONS) {
    if (question.trackId !== trackId) continue;
    for (const kc of questionKcs(question)) ids.add(kc);
  }
  return [...ids];
}
