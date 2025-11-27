import type { StatusType } from '../types';

type Props = {
  message: string;
  type: StatusType;
};

const StatusMessage = ({ message, type }: Props) => {
  if (!message) return null;
  
  return (
    <div className={`text-xs ${type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-600' : 'text-blue-600'}`}>
      {message}
    </div>
  );
};

export default StatusMessage;











