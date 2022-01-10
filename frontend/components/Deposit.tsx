import {
  Input,
  InputGroup,
  InputRightAddon,
  NumberInput,
  NumberInputField,
} from "@chakra-ui/react";
import { useState } from "react";
import { usePhaseInfo } from "../hooks/usePhaseInfo";

export const Deposit = () => {
  const phaseInfo = usePhaseInfo();
  const disabled = phaseInfo.phase !== "UNRESTRICTED";
  const format = (val: string) => val + " USDC";
  const parse = (val: string) => val.replace(/ USDC$/, "");

  const [value, setValue] = useState("0");
  return (
    <NumberInput onChange={(v) => setValue(parse(v))}>
      <InputGroup my="10">
        <NumberInputField
          disabled={disabled}
          variant={disabled ? "filled" : "outline"}
          placeholder="contribution"
        />
        <InputRightAddon>USDC</InputRightAddon>
      </InputGroup>
    </NumberInput>
  );
};
