import { listPrograms } from '@/lib/programsRepository';
import ProgramsList from './ProgramsList';

const ProgramPage = async () => {
  const programs = await listPrograms();
  return <div className="px-4">
    <h2 className="text-5xl font-georgia mx-auto text-center my-12">Programs</h2>
    <ProgramsList initialPrograms={programs} />
  </div>
};

export default ProgramPage;
