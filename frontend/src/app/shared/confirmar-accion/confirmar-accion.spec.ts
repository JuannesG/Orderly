import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmarAccion } from './confirmar-accion';

describe('ConfirmarAccion', () => {
  let component: ConfirmarAccion;
  let fixture: ComponentFixture<ConfirmarAccion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarAccion],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarAccion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
