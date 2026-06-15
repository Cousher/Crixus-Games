import React, { useContext, useState } from "react";
import { register } from "../../../services/auth/auth";
import MainButton from "../../MainButton";
import { saveTokens } from "../../../services/auth/authUtils";
import UserContext from "../../../UserContext";
import { useTranslation } from "react-i18next";

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [profilePicture, _setProfilePicture] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const { toggleLogin } = useContext(UserContext);

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();
    try {
      await register(email, password, nickname, profilePicture)
        .then((response) => {
          saveTokens(response.token, "");
          toggleLogin();
        })
        .catch((error) => {
          console.log(error);
          setError(
            error.response.data.message || error.response.data.errors[0].msg || "Invalid format. Please try again."
          );
        })
        .then(() => {
          setLoading(false);
        });
    } catch (error) {
      console.log(error)
      setError("Invalid format. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center ">
      <div className="relative ">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative bg-white shadow-lg sm:rounded-3xl p-10">
          <div className="max-w-md mx-auto">

            <form onSubmit={handleSubmit}>
              <div className="divide-y divide-gray-200 mt-2">
                <div className="py-2 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  {[
                    {
                      name: "nickname",
                      type: "text",
                      required: true,
                      value: nickname,
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                        setNickname(e.target.value),
                      placeholder: t("auth.nickname"),
                      label: t("auth.nickname"),
                    },
                    {
                      name: "email",
                      type: "email",
                      autoComplete: "email",
                      required: true,
                      value: email,
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                        setEmail(e.target.value),
                      placeholder: t("auth.email"),
                      label: t("auth.email"),
                    },
                    {
                      name: "password",
                      type: "password",
                      autoComplete: "current-password",
                      required: true,
                      value: password,
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                        setPassword(e.target.value),
                      placeholder: t("auth.password"),
                      label: t("auth.password"),
                    }
                  ].map((input) => (
                    <div className="relative" key={input.name}>
                      <input
                        id={input.name}
                        name={input.name}
                        type={input.type}
                        autoComplete={input.autoComplete}
                        required={input.required}
                        value={input.value}
                        onChange={input.onChange}
                        className="peer h-10 w-full border-b-2 border-gray-300 text-gray-900 placeholder-transparent focus:outline-none focus:border-amber-500 bg-white"
                        placeholder={input.placeholder}
                      />
                      <label
                        htmlFor={input.name}
                        className="absolute left-0 -top-3.5 text-gray-600 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-amber-500"
                      >
                        {input.label}
                      </label>
                    </div>
                  ))}

                </div>
                <div className="flex flex-col ">
                  <MainButton
                    text={t("auth.signUp")}
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    onClick={() => { }}
                    disabled={loading}
                    loading={loading}
                    submit
                  />

                  {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
