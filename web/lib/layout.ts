// Shared left-gutter width for lane labels ("ground truth", "baseline", ...).
// The waveform strip above the lanes uses the same value so both share one
// x-axis: without it, the waveform's t=0 sits at x=0 while every lane's t=0
// sits LABEL_WIDTH further right, and predicted windows drift out of register
// with the audio they're supposed to mark.
export const LABEL_WIDTH = "6rem";
