# Spark

5 Vs of data:

- volume: Big Data is characterized by immense amounts of data, often measured in TB or PB.
- variety: Data comes in diverse formats, structured (SQL tables), semi-structured (JSON, XML), and unstructured (images, videos, text).
- velocity: The speed at which data is generated requires rapid ingestion, processing, and decision-making.
  - real-time pipelines, e.g. Kafka for stream processing
  - batch processing, involving processing large datasets
  - modern systems often combine both real-time and batch processing to maximize efficiency and insight quality (Lambda Architecture)
- veracity: Data must be accurate and reliable to drive meaningful insights.
- value: The ultimate goal of Big Data is to generate business value through actionable insights.

## Hadoop

Hadoop (High Availability Distributed Object Oriented Platform): a framework for distributed storage and processing large datasets

HDFS (Hadoop Distributed File System): stores large files by splitting them into smaller blocks and distributing them across a cluster of machines.

## DataFrame

A DataFrame is a two-dimensional labeled data structure with columns of potentially different types, like a spreadsheet, a SQL table, or a dictionary of series objects.
Apache Spark DataFrames are an abstraction built on top of Resilient Distributed Datasets (RDDs).
Spark DataFrames and Spark SQL use a unified planning and optimization engine, allowing you to get nearly identical performance across all supported languages on Databricks (Python, SQL, Scala, R).


