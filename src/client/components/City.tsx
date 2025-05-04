import React from "react";
import District from "@/client/components/District";
import { DistrictName } from "@/server/game/districts";
import { CardSuit } from "@/server/game/types";

interface CityProps {
  city: {
    header: string;
    margin_bottom: number;
    columns: Array<
      Array<{
        value: DistrictName;
        name: string;
        description?: string;
        suit: CardSuit;
        cost?: number;
        beautified?: boolean;
        pos: {
          x: number;
          y: number;
          z: number;
        };
        asset: {
          height: number;
          width: number;
          brightness: number;
          offset_x: number;
          offset_y: number;
          scale_percentage: number;
          path: string;
        };
        artifacts: string[];
      }>
    >;
  };
}

const City: React.FC<CityProps> = ({ city }) => {
  // Function to enable drag functionality (placeholder for now)
  const enableDrag = (selector: string) => {
    // This would be implemented with a proper drag library or custom logic
    console.log(`Drag enabled for ${selector}`);
  };

  // Use useEffect to initialize drag functionality
  React.useEffect(() => {
    enableDrag("#city");
  }, []);

  return (
    <section
      id="city"
      className="panel grow overflow-y-scroll overflow-x-hidden flex flex-col"
    >
      <h2 className="header">{city.header}</h2>
      <div style={{ marginBottom: `${city.margin_bottom}px` }}>
        <div className="flex flex-row flex-wrap gap-2">
          {city.columns.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col">
              {column.map((district, i) => (
                <District
                  key={`${district.value}-${i}`}
                  district={district}
                  inputType="radio"
                  draggable={true}
                  enabled={true}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default City;
