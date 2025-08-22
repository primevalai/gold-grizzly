Help me create the .working/eventing-system.md. I am creating an eventing system for the project. Every agent MUST participate in the eventing system by publishing it's events which may be different than what gets returned by the agent. Each agent will have an XML section describing the events that it publishes. All events follow the OpenTelemetry (OTEL) standard and must provide all required fields.

Events are named following the format <camel-cased agent name>-<camel-cased event name>. If the agent is called `url-cacher` and has an internal event named `urlCached` then the published event would be `urlCacher.urlCached`.

The eventing system itself will have one or more places where the events are sent (I think these are called sinks). To start we will have a filesystem sink located at the root of the project in a folder named `.events`. Every event that is published to this sink (in this case published means writing a file) will be written in a <iso8601-utc-slug>-<event-name>-<event id>.json file.

Is there a way for this eventing system to hook into the Claude Code hooks functionality? Help me refine this idea, ask pertinent questions and lets design this properly.