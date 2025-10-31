// app/src/types/timelock-wallet.ts
export type TimelockWallet = {
  "address": "CPPQFeBovJRCeLQ1Kh7HAX9qQMszh42XMBMpHMrrXBkD";
  "metadata": {
    "name": "timelock_wallet";
    "version": "0.1.0";
    "spec": "0.1.0";
    "description": "Created with Anchor";
  };
  "instructions": [
    {
      "name": "add_funds";
      "discriminator": [132, 237, 76, 57, 80, 10, 179, 138];
      "accounts": [
        {
          "name": "owner";
          "writable": true;
          "signer": true;
        },
        {
          "name": "deposit";
          "writable": true;
        },
        {
          "name": "mint";
        },
        {
          "name": "owner_token_account";
          "writable": true;
        },
        {
          "name": "vault_token_account";
          "writable": true;
        },
        {
          "name": "token_program";
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      "args": [
        {
          "name": "additional_amount";
          "type": "u64";
        }
      ];
    },
    {
      "name": "initialize_deposit";
      "docs": ["Инициализация депозита по времени (как было)"];
      "discriminator": [171, 65, 93, 225, 61, 109, 31, 227];
      "accounts": [
        {
          "name": "owner";
          "writable": true;
          "signer": true;
        },
        {
          "name": "deposit";
          "writable": true;
          "pda": {
            "seeds": [
              {
                "kind": "const";
                "value": [100, 101, 112, 111, 115, 105, 116];
              },
              {
                "kind": "account";
                "path": "owner";
              },
              {
                "kind": "arg";
                "path": "unlock_timestamp";
              }
            ];
          };
        },
        {
          "name": "mint";
        },
        {
          "name": "owner_token_account";
          "writable": true;
        },
        {
          "name": "vault_token_account";
          "writable": true;
          "pda": {
            "seeds": [
              {
                "kind": "const";
                "value": [118, 97, 117, 108, 116];
              },
              {
                "kind": "account";
                "path": "deposit";
              }
            ];
          };
        },
        {
          "name": "system_program";
          "address": "11111111111111111111111111111111";
        },
        {
          "name": "token_program";
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          "name": "rent";
          "address": "SysvarRent111111111111111111111111111111111";
        }
      ];
      "args": [
        {
          "name": "amount";
          "type": "u64";
        },
        {
          "name": "unlock_timestamp";
          "type": "i64";
        }
      ];
    },
    {
      "name": "initialize_deposit_by_amount";
      "docs": ["Новая инициализация депозита: разблокировка по достижению суммы"];
      "discriminator": [32, 207, 197, 87, 141, 147, 231, 97];
      "accounts": [
        {
          "name": "owner";
          "writable": true;
          "signer": true;
        },
        {
          "name": "deposit";
          "writable": true;
          "pda": {
            "seeds": [
              {
                "kind": "const";
                "value": [100, 101, 112, 111, 115, 105, 116];
              },
              {
                "kind": "account";
                "path": "owner";
              },
              {
                "kind": "arg";
                "path": "unlock_amount";
              }
            ];
          };
        },
        {
          "name": "mint";
        },
        {
          "name": "owner_token_account";
          "writable": true;
        },
        {
          "name": "vault_token_account";
          "writable": true;
          "pda": {
            "seeds": [
              {
                "kind": "const";
                "value": [118, 97, 117, 108, 116];
              },
              {
                "kind": "account";
                "path": "deposit";
              }
            ];
          };
        },
        {
          "name": "system_program";
          "address": "11111111111111111111111111111111";
        },
        {
          "name": "token_program";
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          "name": "rent";
          "address": "SysvarRent111111111111111111111111111111111";
        }
      ];
      "args": [
        {
          "name": "amount";
          "type": "u64";
        },
        {
          "name": "unlock_amount";
          "type": "u64";
        }
      ];
    },
    {
      "name": "withdraw";
      "discriminator": [183, 18, 70, 156, 148, 109, 161, 34];
      "accounts": [
        {
          "name": "owner";
          "writable": true;
          "signer": true;
        },
        {
          "name": "deposit";
          "writable": true;
        },
        {
          "name": "vault_token_account";
          "writable": true;
        },
        {
          "name": "owner_token_account";
          "writable": true;
        },
        {
          "name": "token_program";
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      "args": [];
    }
  ];
  "accounts": [
    {
      "name": "TimeLockDeposit";
      "discriminator": [81, 59, 87, 143, 130, 141, 253, 131];
    }
  ];
  "events": [
    {
      "name": "DepositCreated";
      "discriminator": [146, 225, 181, 133, 194, 173, 54, 71];
    },
    {
      "name": "DepositCreatedByAmount";
      "discriminator": [187, 212, 132, 75, 239, 178, 22, 199];
    },
    {
      "name": "DepositFundsAdded";
      "discriminator": [123, 200, 239, 106, 106, 97, 49, 184];
    },
    {
      "name": "DepositWithdrawn";
      "discriminator": [152, 139, 194, 204, 237, 235, 26, 134];
    }
  ];
  "errors": [
    {
      "code": 6000;
      "name": "InvalidAmount";
      "msg": "Invalid amount";
    },
    {
      "code": 6001;
      "name": "InvalidTimestamp";
      "msg": "Invalid timestamp";
    },
    {
      "code": 6002;
      "name": "NotActive";
      "msg": "Deposit is not active";
    },
    {
      "code": 6003;
      "name": "ConditionsNotMet";
      "msg": "Withdrawal conditions not met";
    },
    {
      "code": 6004;
      "name": "Unauthorized";
      "msg": "Unauthorized";
    },
    {
      "code": 6005;
      "name": "Overflow";
      "msg": "Overflow";
    }
  ];
  "types": [
    {
      "name": "ConditionType";
      "docs": ["Тип условия (ByTime или ByAmount)"];
      "type": {
        "kind": "enum";
        "variants": [
          {
            "name": "ByTime";
          },
          {
            "name": "ByAmount";
          }
        ];
      };
    },
    {
      "name": "DepositCreated";
      "type": {
        "kind": "struct";
        "fields": [
          {
            "name": "owner";
            "type": "pubkey";
          },
          {
            "name": "amount";
            "type": "u64";
          },
          {
            "name": "unlock_timestamp";
            "type": "i64";
          },
          {
            "name": "token";
            "type": "pubkey";
          }
        ];
      };
    },
    {
      "name": "DepositCreatedByAmount";
      "type": {
        "kind": "struct";
        "fields": [
          {
            "name": "owner";
            "type": "pubkey";
          },
          {
            "name": "amount";
            "type": "u64";
          },
          {
            "name": "unlock_amount";
            "type": "u64";
          },
          {
            "name": "token";
            "type": "pubkey";
          }
        ];
      };
    },
    {
      "name": "DepositFundsAdded";
      "type": {
        "kind": "struct";
        "fields": [
          {
            "name": "owner";
            "type": "pubkey";
          },
          {
            "name": "deposit";
            "type": "pubkey";
          },
          {
            "name": "additional_amount";
            "type": "u64";
          },
          {
            "name": "new_total_amount";
            "type": "u64";
          }
        ];
      };
    },
    {
      "name": "DepositState";
      "type": {
        "kind": "enum";
        "variants": [
          {
            "name": "Active";
          },
          {
            "name": "Withdrawn";
          }
        ];
      };
    },
    {
      "name": "DepositWithdrawn";
      "type": {
        "kind": "struct";
        "fields": [
          {
            "name": "owner";
            "type": "pubkey";
          },
          {
            "name": "amount";
            "type": "u64";
          },
          {
            "name": "token";
            "type": "pubkey";
          },
          {
            "name": "time";
            "type": "i64";
          }
        ];
      };
    },
    {
      "name": "LockCondition";
      "docs": ["Условие блокировки (включает оба варианта)"];
      "type": {
        "kind": "struct";
        "fields": [
          {
            "name": "unlock_timestamp";
            "type": "i64";
          },
          {
            "name": "unlock_amount";
            "type": "u64";
          },
          {
            "name": "condition_type";
            "type": {
              "defined": {
                "name": "ConditionType";
              };
            };
          }
        ];
      };
    },
    {
      "name": "TimeLockDeposit";
      "type": {
        "kind": "struct";
        "fields": [
          {
            "name": "owner";
            "type": "pubkey";
          },
          {
            "name": "mint";
            "type": "pubkey";
          },
          {
            "name": "vault_token_account";
            "type": "pubkey";
          },
          {
            "name": "amount";
            "type": "u64";
          },
          {
            "name": "lock_condition";
            "type": {
              "defined": {
                "name": "LockCondition";
              };
            };
          },
          {
            "name": "lock_seed";
            "type": {
              "array": ["u8", 8];
            };
          },
          {
            "name": "state";
            "type": {
              "defined": {
                "name": "DepositState";
              };
            };
          },
          {
            "name": "created_at";
            "type": "i64";
          },
          {
            "name": "bump";
            "type": "u8";
          }
        ];
      };
    }
  ];
};

export const IDL: TimelockWallet = {
  "address": "CPPQFeBovJRCeLQ1Kh7HAX9qQMszh42XMBMpHMrrXBkD",
  "metadata": {
    "name": "timelock_wallet",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "add_funds",
      "discriminator": [
        132,
        237,
        76,
        57,
        80,
        10,
        179,
        138
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "deposit",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "owner_token_account",
          "writable": true
        },
        {
          "name": "vault_token_account",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "additional_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize_deposit",
      "docs": [
        "Инициализация депозита по времени (как было)"
      ],
      "discriminator": [
        171,
        65,
        93,
        225,
        61,
        109,
        31,
        227
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "unlock_timestamp"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "owner_token_account",
          "writable": true
        },
        {
          "name": "vault_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "unlock_timestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "initialize_deposit_by_amount",
      "docs": [
        "Новая инициализация депозита: разблокировка по достижению суммы"
      ],
      "discriminator": [
        32,
        207,
        197,
        87,
        141,
        147,
        231,
        97
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "unlock_amount"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "owner_token_account",
          "writable": true
        },
        {
          "name": "vault_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "unlock_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "deposit",
          "writable": true
        },
        {
          "name": "vault_token_account",
          "writable": true
        },
        {
          "name": "owner_token_account",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "TimeLockDeposit",
      "discriminator": [81, 59, 87, 143, 130, 141, 253, 131]
    }
  ],
  "events": [
    {
      "name": "DepositCreated",
      "discriminator": [146, 225, 181, 133, 194, 173, 54, 71]
    },
    {
      "name": "DepositCreatedByAmount",
      "discriminator": [187, 212, 132, 75, 239, 178, 22, 199]
    },
    {
      "name": "DepositFundsAdded",
      "discriminator": [123, 200, 239, 106, 106, 97, 49, 184]
    },
    {
      "name": "DepositWithdrawn",
      "discriminator": [152, 139, 194, 204, 237, 235, 26, 134]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6001,
      "name": "InvalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 6002,
      "name": "NotActive",
      "msg": "Deposit is not active"
    },
    {
      "code": 6003,
      "name": "ConditionsNotMet",
      "msg": "Withdrawal conditions not met"
    },
    {
      "code": 6004,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6005,
      "name": "Overflow",
      "msg": "Overflow"
    }
  ],
  "types": [
    {
      "name": "ConditionType",
      "docs": [
        "Тип условия (ByTime или ByAmount)"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "ByTime"
          },
          {
            "name": "ByAmount"
          }
        ]
      }
    },
    {
      "name": "DepositCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "unlock_timestamp",
            "type": "i64"
          },
          {
            "name": "token",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "DepositCreatedByAmount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "unlock_amount",
            "type": "u64"
          },
          {
            "name": "token",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "DepositFundsAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "deposit",
            "type": "pubkey"
          },
          {
            "name": "additional_amount",
            "type": "u64"
          },
          {
            "name": "new_total_amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "DepositState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Withdrawn"
          }
        ]
      }
    },
    {
      "name": "DepositWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "token",
            "type": "pubkey"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "LockCondition",
      "docs": [
        "Условие блокировки (включает оба варианта)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "unlock_timestamp",
            "type": "i64"
          },
          {
            "name": "unlock_amount",
            "type": "u64"
          },
          {
            "name": "condition_type",
            "type": {
              "defined": {
                "name": "ConditionType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TimeLockDeposit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault_token_account",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "lock_condition",
            "type": {
              "defined": {
                "name": "LockCondition"
              }
            }
          },
          {
            "name": "lock_seed",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "DepositState"
              }
            }
          },
          {
            "name": "created_at",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};