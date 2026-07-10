import { circleArea } from "./circle-area";
import { eulerIdentity } from "./euler-identity";
import { newtonsSecondLaw } from "./newtons-second-law";
import { pythagoreanTheorem } from "./pythagorean-theorem";

import type { Formula } from "../formula.types";

export const formulas: Formula[] = [
  eulerIdentity,
  pythagoreanTheorem,
  circleArea,
  newtonsSecondLaw,
];
