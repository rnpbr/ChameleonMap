import { 
  Component,
  EventEmitter,
  Output
 } from '@angular/core';

@Component({
  selector: 'app-chameleon-button',
  templateUrl: './chameleon-button.component.html',
  styleUrl: './chameleon-button.component.css'
})
export class ChameleonButtonComponent {
  @Output() clicked = new EventEmitter<void>();

  onClick() {
    this.clicked.emit();
  }
}
