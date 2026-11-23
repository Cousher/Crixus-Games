import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Case from "../../components/Case";
import Title from "../../components/Title";

interface CaseListingProps {
  name: string;
  description?: string;
  cases: any[];
}

const CaseListing: React.FC<CaseListingProps> = ({
  name,
  description,
  cases,
}) => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  return (
    <section className="w-full flex flex-col items-center py-6 sm:py-8 px-4" key={name}>
      <div className="flex flex-col items-center w-full max-w-[1440px]">
        <Title
          title={name}
          subtitle={
            description ||
            (es
              ? "Abrí cofres imperiales y coleccioná reliquias exclusivas del Coliseo"
              : "Open imperial chests and collect exclusive Colosseum relics")
          }
        />

        <div
          className={`grid gap-4 sm:gap-6 w-full ${
            cases.length <= 3
              ? "grid-cols-2 sm:grid-cols-3 max-w-[920px]"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          }`}
        >
          {cases.map((item: any) => (
            <Link to={`/case/${item._id}`} key={item._id} className="w-full">
              <Case
                id={item._id}
                title={item.title}
                image={item.image}
                price={item.price}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseListing;
