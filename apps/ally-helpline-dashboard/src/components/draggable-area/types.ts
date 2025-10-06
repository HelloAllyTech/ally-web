import { Accept } from "react-dropzone";

export interface DraggableAreaProps {
  allowMultiple?: boolean;
  onDropAccepted: (files: File[]) => void;
  onDropRejected: (files: any[]) => void;
  sizeInBytes: number;
  supportedExtensions: Accept;
}
