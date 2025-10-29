import { StatusType } from './types';

const StatusMessage = ({message, type}:{message: string, type: StatusType}) => {
  if (!type || !message) return null;
  
  const colors = {
    info: 'bg-blue-50 text-blue-900 border-blue-500',
    success: 'bg-green-50 text-green-900 border-green-500',
    error: 'bg-red-50 text-red-900 border-red-500'
  };
  
  return (
    <div className={`mt-6 px-4 py-3 rounded-lg text-sm border-l-4 animate-in slide-in-from-top-2 ${colors[type]}`}>
      {message}
    </div>
  );
};

export default StatusMessage;

