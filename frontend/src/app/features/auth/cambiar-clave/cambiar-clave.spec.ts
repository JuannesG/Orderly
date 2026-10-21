import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CambiarClave } from './cambiar-clave';

describe('CambiarClave', () => {
  let component: CambiarClave;
  let fixture: ComponentFixture<CambiarClave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CambiarClave],
    }).compileComponents();

    fixture = TestBed.createComponent(CambiarClave);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
