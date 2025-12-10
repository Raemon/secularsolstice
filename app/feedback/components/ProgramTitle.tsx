const ProgramTitle = ({title, suffix}:{title: string, suffix: string}) => {
  return <h2 className="text-4xl text-center my-12 font-semibold font-georgia">{title} {suffix}</h2>
}

export default ProgramTitle;

