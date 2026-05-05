export declare class CreateReceiptDto {
    id?: number;
    patient: string;
    uhid: string;
    amount: number;
    gross: number;
    coverage: number;
    insurance: string;
    mode: string;
    status: string;
    ts?: number;
}
