import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResumenEstadisticas } from './resumen-estadisticas';

describe('ResumenEstadisticas', () => {
  let component: ResumenEstadisticas;
  let fixture: ComponentFixture<ResumenEstadisticas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenEstadisticas],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenEstadisticas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
