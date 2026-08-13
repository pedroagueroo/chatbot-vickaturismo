function checkEscalation(text, keywords = []) {
  if (!text || !keywords || keywords.length === 0) return false;
  
  const lowerText = text.toLowerCase();
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  return false;
}

module.exports = { checkEscalation };
