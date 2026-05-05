import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { CreateWardDto, CreateBedDto } from './create-ward.dto';

@Injectable()
export class WardService {
  constructor(private dataService: DataService) {}

  // WARD
  findAllWards() {
    return this.dataService.wards;
  }

  createWard(ward: CreateWardDto) {
    const newWard = {
      ward_id: this.dataService.wards.length > 0 ? Math.max(...this.dataService.wards.map(w => w.ward_id)) + 1 : 1,
      ...ward
    };
    this.dataService.wards.push(newWard);
    return newWard;
  }

  // BED
  findAllBeds() {
    return this.dataService.beds;
  }

  findBedsByWard(ward_id: number) {
    return this.dataService.beds.filter(b => b.ward_id === ward_id);
  }

  createBed(bed: CreateBedDto) {
    const newBed = {
      bed_id: this.dataService.beds.length > 0 ? Math.max(...this.dataService.beds.map(b => b.bed_id)) + 1 : 11,
      ...bed
    };
    this.dataService.beds.push(newBed);
    return newBed;
  }

  updateBedStatus(bed_id: number, status: string) {
    const bed = this.dataService.beds.find(b => b.bed_id === bed_id);
    if (!bed) return null;
    bed.status = status;
    return bed;
  }
}
