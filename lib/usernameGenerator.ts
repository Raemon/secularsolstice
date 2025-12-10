const solsticeWords = ['Winter', 'Solstice', 'Candlelight', 'Starlight', 'Twilight', 'Dawn', 'Darkness', 'Light', 'Cosmos', 'Void', 'Galaxy', 'Nebula', 'Eclipse', 'Equinox', 'Midwinter', 'Stellar', 'Horizon', 'Dusk', 'Aurora', 'Eternal', 'Frozen', 'Silent', 'Ancient', 'Cosmic', 'Celestial', 'Astronomical', 'Infinite', 'Cold', 'Snow', 'Ice', 'Frost', 'Crystal', 'Night', 'Moon', 'Star', 'Comet', 'Meteor', 'Orbit', 'Gravity', 'Entropy', 'Quantum', 'Singularity', 'Event', 'Horizon', 'Waning', 'Rising', 'Setting', 'Axial'];
const rationalityWords = ['Bayesian', 'Rational', 'Epistemic', 'Prior', 'Update', 'Evidence', 'Logic', 'Reason', 'Calibrated', 'Fermi', 'Posterior', 'Coherent', 'Utility', 'Expected', 'Optimal', 'Meta', 'Aligned', 'Consequent', 'Deductive', 'Inductive', 'Abductive', 'Heuristic', 'Bias', 'Truthseeker', 'Skeptic', 'Empirical', 'Fallible', 'Falsifiable', 'Credence', 'Likelihood', 'Inference', 'Hypothesis', 'Theorem', 'Axiom', 'Principle', 'Instrumental', 'Terminal', 'Effective', 'Altruist', 'Utilitarian', 'Consequentialist', 'Reflective', 'Coherentist', 'Foundationalist', 'Pragmatic', 'Analytic', 'Synthetic'];

export const generateUsername = () => {
  const solsticeWord = solsticeWords[Math.floor(Math.random() * solsticeWords.length)];
  const rationalityWord = rationalityWords[Math.floor(Math.random() * rationalityWords.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  const rationalityFirst = Math.random() < 0.5;
  return rationalityFirst 
    ? `${rationalityWord}${solsticeWord}-${digits}`
    : `${solsticeWord}${rationalityWord}-${digits}`;
};
