export interface AdOptions {
  onReward?: () => void;
  onClose?: () => void;
}

export class AdService {
  private isCapacitorNative: boolean = false;
  private adsEnabled: boolean = true;
  private quizQuestionsAnsweredCount: number = 0;

  constructor() {
    // Check if running inside Capacitor Android/iOS WebView
    this.isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform?.();
  }

  public setAdsEnabled(enabled: boolean): void {
    this.adsEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.adsEnabled;
  }

  /**
   * Tracks natural intervals so interstitial ads NEVER interrupt single questions.
   * Only after a natural break (e.g. 2 full completed quizzes).
   */
  public registerQuizCompletion(): void {
    this.quizQuestionsAnsweredCount += 10;
  }

  public shouldShowBreakAd(): boolean {
    return this.adsEnabled && this.quizQuestionsAnsweredCount >= 20;
  }

  /**
   * Shows interstitial ad at a natural break
   */
  public async showInterstitialAd(): Promise<void> {
    if (!this.adsEnabled) return;

    if (this.isCapacitorNative) {
      console.log('[AdMob Native] Requesting Interstitial Ad through Capacitor AdMob plugin');
      // In native production, this calls AdMob.showInterstitial();
    } else {
      console.log('[Web Ads] Showing non-intrusive banner/interstitial modal in web');
    }
    this.quizQuestionsAnsweredCount = 0;
  }

  /**
   * Rewarded Ad for hints, extra life or bonus
   */
  public async showRewardedAd(options: AdOptions): Promise<boolean> {
    if (!this.adsEnabled) {
      if (options.onReward) options.onReward();
      return true;
    }

    if (this.isCapacitorNative) {
      console.log('[AdMob Native] Rewarded Ad loaded via Capacitor');
      // Calls AdMob.showRewardVideoAd()
      setTimeout(() => {
        if (options.onReward) options.onReward();
        if (options.onClose) options.onClose();
      }, 1500);
      return true;
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (options.onReward) options.onReward();
          if (options.onClose) options.onClose();
          resolve(true);
        }, 500);
      });
    }
  }
}

export const ads = new AdService();
