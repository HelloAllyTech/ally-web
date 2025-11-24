import { useGetUpComingSimulationQuery } from "@api";

export const UpNextSimulationCard = ({ chatId }: { chatId: string }) => {
  const { data: upComingSimulation } = useGetUpComingSimulationQuery(chatId, {
    skip: !chatId,
  });

  const { title, description, coverImageUrl, scenario, simulationNumber } =
    upComingSimulation || {};

  return (
    <div>
      <div className="text-typography-900 text-base font-semibold mb-[8px]">{title}</div>
      <div className="text-typography-900 text-base font-normal mb-[8px]">{description}</div>
      <div className="rounded-[8px] border border-border-light">
        <div className="flex p-4 gap-4 bg-background-secondary">
          <img
            src={coverImageUrl}
            alt={title}
            className="w-[120px] h-[60px] bg-secondary-100 object-cover rounded-[8px]"
          />
          <div className="flex flex-col justify-center">
            <div className="text-typography-800 text-sm font-tertiary">
              Up next - Simulation {simulationNumber}
            </div>
            <div className="text-typography-900 text-xl">{title}</div>
          </div>
        </div>

        <div className="p-4">
          {/* Scenario Label */}
          <div className="text-base text-typography-800 font-semibold">Scenario:</div>

          {/* Scenario Description */}
          <div className="text-base text-typography-900 font-normal">{scenario}</div>
        </div>
      </div>
    </div>
  );
};
