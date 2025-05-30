export const logStyles = (element, properties) => {
  if (!element) return null;
  const styles = window.getComputedStyle(element);
  const computedStyles = {};

  properties.forEach((prop) => {
    computedStyles[prop] = styles.getPropertyValue(prop);
  });

  return computedStyles;
};
