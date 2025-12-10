import { ProgramFeedback } from "../ProgramFeedback";

const ProgramFeedbackPage = ({params}:{params:{programId:string}}) => {
  return <ProgramFeedback initialProgramId={params.programId} />;
};

export default ProgramFeedbackPage;


