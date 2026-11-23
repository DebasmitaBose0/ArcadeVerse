/**
 * ArcadeVerse - Interactive Voice-Guided Arcade Audio Tour Subsystem
 */

class ArcadeTourGuide {
  constructor(steps = null) {
    this.steps = steps || [
      { id: 'featured-games', title: 'Featured Arcade Classics', voicePrompt: 'Welcome to ArcadeVerse! Explore our curated retro arcade titles.' },
      { id: 'category-filter', title: 'Category Filter', voicePrompt: 'Filter games by genre, action, puzzle, or retro nostalgia.' },
      { id: 'leaderboard', title: 'Global Leaderboards', voicePrompt: 'Check high scores and compete with players worldwide.' },
      { id: 'theme-customizer', title: 'Theme Studio', voicePrompt: 'Switch between authentic CRT, amber, and phosphor themes.' }
    ];
    this.currentIndex = 0;
    this.muted = false;
    this.completed = false;
  }

  getCurrentStep() {
    return this.steps[this.currentIndex] || null;
  }

  next() {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++;
      return this.getCurrentStep();
    }
    this.completed = true;
    return null;
  }

  previous() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.getCurrentStep();
    }
    return this.getCurrentStep();
  }

  skip() {
    this.completed = true;
    return { completed: true };
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ArcadeTourGuide };
}
