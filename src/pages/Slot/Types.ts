export interface SlotWinLine {
    line: string;
    payout: number;
}

export interface SlotProps {
    userId: string;
    betAmount: number;
    gridState: string[];
    lastSpinResult: SlotWinLine[];
    totalPayout: number;
    walletBalance?: number;
    xp?: number;
    level?: number;
}