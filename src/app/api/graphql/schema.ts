export const typeDefs = /* GraphQL */ `
  type Query {
    stations: [Station!]!
    station(id: Int!): Station
    rivers: [River!]!
    river(id: Int!): River
  }

  type Station {
    id: Int!
    name: String!
    idExternal: String!
    code: String
    riverName: String
    basinName: String
    lat: Float
    lon: Float
    elevationM: Float
    isActive: Boolean!
    measurements(period: Period = _3D, from: String, to: String): [Measurement!]!
    measurementStats(period: Period = _3D, from: String, to: String): MeasurementStats
    availability: Availability!
  }

  type River {
    id: Int!
    name: String!
    basinName: String
    stationCount: Int!
    latestAvgDischargeM3s: Float
    measurements(granularity: Granularity = HOUR, period: RiverPeriod = _3D, from: String, to: String): [Measurement!]!
    measurementStats(granularity: Granularity = HOUR, period: RiverPeriod = _3D, from: String, to: String): MeasurementStats
    availability: Availability!
  }

  type Measurement {
    ts: String!
    waterLevelCm: Float
    dischargeM3s: Float
  }

  type ValueStats {
    min: Float!
    max: Float!
    avg: Float!
    median: Float!
    maxChange: Float
  }

  type MeasurementStats {
    waterLevelCm: ValueStats
    dischargeM3s: ValueStats
  }

  type YearMonths {
    year: Int!
    months: [Int!]!
  }

  type Availability {
    years: [Int!]!
    yearMonths: [YearMonths!]!
  }

  enum Period {
    _24H
    _3D
    _7D
    _30D
  }

  enum Granularity {
    _10MIN
    HOUR
    DAY
    MONTH
    YEAR
  }

  enum RiverPeriod {
    _24H
    _3D
    _7D
    _30D
    _90D
    _1Y
    _5Y
    ALL
  }
`;
