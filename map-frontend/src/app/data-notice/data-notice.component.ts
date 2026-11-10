import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { TranslationService } from '../translation.service';

const DISMISSED_KEY = 'dataNoticeDismissed';

/**
 * Tells visitors, on their first visit, where the map's data comes
 * from (partly from the institutions, partly extracted
 * semi-automatically or with AI) and that it may differ from official
 * sources. Once dismissed, a small reminder stays in the corner
 * and reopens the notice. Shown only when the map settings turn it on
 * (data_notice_enabled).
 */
@Component({
  selector: 'app-data-notice',
  templateUrl: './data-notice.component.html',
  styleUrls: ['./data-notice.component.css']
})
export class DataNoticeComponent implements OnInit {
  // Where "How the data is maintained" points (settings' data_notice_url);
  // the link is hidden without one.
  @Input() learnMoreUrl: string | null = null;

  @ViewChild('dismissButton') dismissButton: ElementRef<HTMLButtonElement>;

  public open = false;

  constructor(private translationService: TranslationService) {}

  ngOnInit() {
    this.open = !this.wasDismissed();
    if (this.open) {
      this.focusDismissButton();
    }
  }

  public t(key: string): string {
    return this.translationService.t(key);
  }

  public dismiss() {
    this.open = false;
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage blocked: the notice just shows again on the next visit.
    }
  }

  public reopen() {
    this.open = true;
    this.focusDismissButton();
  }

  public onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.dismiss();
    }
  }

  private wasDismissed(): boolean {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }

  private focusDismissButton() {
    setTimeout(() => this.dismissButton?.nativeElement.focus());
  }
}
