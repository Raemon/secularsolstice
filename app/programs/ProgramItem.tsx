'use client';
import Link from 'next/link';
import MyTooltip from '@/app/components/Tooltip';
import { formatRelativeTimestamp } from '@/lib/dateUtils';
import type { Program } from './types';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

type ProgramItemProps = {
  program: Program;
  linkPrefix?: string;
};

const ProgramItem = ({program, linkPrefix = '/programs'}: ProgramItemProps) => {
  return (
    <div className="flex items-center bg-black/30 gap-3 px-2 py-2 border-b border-gray-800">
      <Link href={`/programs/${program.id}/script`} className="flex-1 text-2xl font-georgia text-white hover:text-gray-300">
        {program.title}
      </Link>
      {program.createdAt && (
        <MyTooltip content={<div>{formatDate(program.createdAt)}{program.createdBy && ` - ${program.createdBy}`}</div>} placement="left">
          <span className="text-gray-600 text-xs">{formatRelativeTimestamp(program.createdAt)}</span>
        </MyTooltip>
      )}
    </div>
  );
};

export default ProgramItem;
