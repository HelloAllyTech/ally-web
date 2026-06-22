/** Score badge / bar color: red < 33, amber < 66, green otherwise. */
export const scoreColor = (value: number): string => {
  if (value < 33) return "#FE6F64";
  if (value < 66) return "#FFB74D";
  return "#81C784";
};
